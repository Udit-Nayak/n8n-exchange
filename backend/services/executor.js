import cron from "node-cron";
import {
  Workflow,
  Execution,
  Transaction,
  Portfolio,
  User,
  MarketPrice,
  Log,
  Position,
} from "../models/index.js";
import EventEmitter from "events";

class WorkflowExecutor extends EventEmitter {
  constructor() {
    super();
    this.scheduledJobs = new Map(); // workflowId -> cron job
    this.priceMonitors = new Map(); // workflowId -> interval handle
    this.priceState = new Map(); // jobKey -> { symbol, lastPrice, peakPrice, trailingPercent }
    this.triggeredOnce = new Set(); // jobKey -> track if one-time triggers have fired
  }

  // Initialize executor: load all active workflows
  async initialize() {
    try {
      const activeWorkflows = await Workflow.find({ isActive: true });
      console.log(`🔄 Initializing ${activeWorkflows.length} active workflows...`);

      for (const workflow of activeWorkflows) {
        await this.scheduleWorkflow(workflow);
      }

      console.log("✅ Workflow executor initialized");
    } catch (error) {
      console.error("❌ Failed to initialize workflow executor:", error);
      await Log.error("execution", "Failed to initialize workflow executor", {
        metadata: { error: error.message },
        stack: error.stack,
      });
    }
  }

  // Schedule a workflow based on its trigger nodes
  async scheduleWorkflow(workflow) {
    try {
      const triggerNodes = workflow.getTriggerNodes();

      for (const triggerNode of triggerNodes) {
        if (triggerNode.type === "timer") {
          await this.scheduleTimerTrigger(workflow, triggerNode);
        } else if (
          [
            "price-monitor",
            "price-cross-above",
            "price-cross-below",
            "stop-loss",
            "take-profit",
            "trailing-stop",
          ].includes(triggerNode.type)
        ) {
          await this.schedulePriceMonitor(workflow, triggerNode);
        }
      }

      await Log.info("execution", `Workflow scheduled: ${workflow.name}`, {
        workflowId: workflow._id,
        userId: workflow.userId,
      });
    } catch (error) {
      console.error(`❌ Failed to schedule workflow ${workflow._id}:`, error);
      await Log.error("execution", `Failed to schedule workflow: ${workflow.name}`, {
        workflowId: workflow._id,
        userId: workflow.userId,
        metadata: { error: error.message },
      });
    }
  }

  // Schedule a timer-based trigger
  async scheduleTimerTrigger(workflow, triggerNode) {
    const { cronExpression } = triggerNode.data;

    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const jobKey = `${workflow._id}-${triggerNode.id}`;

    // Remove existing job if any
    if (this.scheduledJobs.has(jobKey)) {
      this.scheduledJobs.get(jobKey).stop();
    }

    // Create new cron job
    const job = cron.schedule(cronExpression, async () => {
      await this.executeWorkflow(workflow._id, {
        triggerType: "timer",
        triggerNodeId: triggerNode.id,
        cronExpression,
      });
    });

    this.scheduledJobs.set(jobKey, job);

    // Update workflow cron state
    await workflow.updateCronState({
      jobId: jobKey,
      cronExpression,
      isScheduled: true,
      lastRun: null,
      nextRun: this.getNextCronRun(cronExpression),
    });

    console.log(`⏰ Timer scheduled for workflow "${workflow.name}": ${cronExpression}`);
  }

  // Schedule a price monitor trigger (handles all price-based triggers)
  async schedulePriceMonitor(workflow, triggerNode) {
    const {
      symbol,
      condition,
      targetPrice,
      stopPrice,
      trailingPercent,
      pollInterval = 10000,
    } = triggerNode.data;
    const jobKey = `${workflow._id}-${triggerNode.id}`;
    const triggerType = triggerNode.type;

    // Remove existing monitor if any
    if (this.priceMonitors.has(jobKey)) {
      clearInterval(this.priceMonitors.get(jobKey));
      this.priceState.delete(jobKey);
      this.triggeredOnce.delete(jobKey);
    }

    // Initialize price state
    this.priceState.set(jobKey, {
      symbol,
      lastPrice: null,
      peakPrice: null,
      trailingPercent: trailingPercent || 0,
    });

    // Create price monitoring interval
    const intervalHandle = setInterval(async () => {
      try {
        const marketPrice = await MarketPrice.findOne({ symbol });
        if (!marketPrice) return;

        const currentPrice = marketPrice.price;
        const state = this.priceState.get(jobKey);
        const previousPrice = state.lastPrice;
        let shouldTrigger = false;
        let triggerReason = "";

        // Initialize lastPrice on first run
        if (previousPrice === null) {
          state.lastPrice = currentPrice;
          if (triggerType === "trailing-stop") {
            state.peakPrice = currentPrice;
          }
          return;
        }

        // Handle different trigger types
        switch (triggerType) {
          case "price-monitor":
            // Old behavior - static comparison
            switch (condition) {
              case "above":
                shouldTrigger = currentPrice > targetPrice;
                break;
              case "below":
                shouldTrigger = currentPrice < targetPrice;
                break;
              case "equals":
                shouldTrigger = Math.abs(currentPrice - targetPrice) < 0.01;
                break;
            }
            triggerReason = `Price ${condition} ${targetPrice}`;
            break;

          case "price-cross-above":
            // Crossed FROM below TO above
            if (previousPrice <= targetPrice && currentPrice > targetPrice) {
              shouldTrigger = true;
              triggerReason = `Price crossed above ${targetPrice} (${previousPrice.toFixed(2)} → ${currentPrice.toFixed(2)})`;
              this.triggeredOnce.add(jobKey); // Mark as triggered
            }
            break;

          case "price-cross-below":
            // Crossed FROM above TO below
            if (previousPrice >= targetPrice && currentPrice < targetPrice) {
              shouldTrigger = true;
              triggerReason = `Price crossed below ${targetPrice} (${previousPrice.toFixed(2)} → ${currentPrice.toFixed(2)})`;
              this.triggeredOnce.add(jobKey);
            }
            break;

          case "stop-loss":
            // Trigger when price drops below stop price
            const stopTarget = stopPrice || targetPrice;
            if (currentPrice <= stopTarget && !this.triggeredOnce.has(jobKey)) {
              shouldTrigger = true;
              triggerReason = `Stop loss triggered at ${currentPrice.toFixed(2)} (stop: ${stopTarget})`;
              this.triggeredOnce.add(jobKey);
            }
            break;

          case "take-profit":
            // Trigger when price rises above target
            const profitTarget = targetPrice;
            if (currentPrice >= profitTarget && !this.triggeredOnce.has(jobKey)) {
              shouldTrigger = true;
              triggerReason = `Take profit triggered at ${currentPrice.toFixed(2)} (target: ${profitTarget})`;
              this.triggeredOnce.add(jobKey);
            }
            break;

          case "trailing-stop":
            // Update peak price if current is higher
            if (currentPrice > state.peakPrice) {
              state.peakPrice = currentPrice;
            }

            // Calculate trailing stop price
            const trailingStopPrice = state.peakPrice * (1 - state.trailingPercent / 100);

            // Trigger if price drops below trailing stop
            if (currentPrice <= trailingStopPrice && !this.triggeredOnce.has(jobKey)) {
              shouldTrigger = true;
              triggerReason = `Trailing stop triggered at ${currentPrice.toFixed(2)} (peak: ${state.peakPrice.toFixed(2)}, stop: ${trailingStopPrice.toFixed(2)}, trail: ${state.trailingPercent}%)`;
              this.triggeredOnce.add(jobKey);
            }
            break;
        }

        // Update last price
        state.lastPrice = currentPrice;

        // Execute workflow if condition met
        if (shouldTrigger) {
          console.log(`🎯 ${triggerReason}`);
          await this.executeWorkflow(workflow._id, {
            triggerType,
            triggerNodeId: triggerNode.id,
            symbol,
            currentPrice,
            previousPrice,
            targetPrice: targetPrice || stopPrice,
            condition,
            reason: triggerReason,
            peakPrice: state.peakPrice,
          });

          // For one-time triggers, unschedule after execution
          if (
            [
              "price-cross-above",
              "price-cross-below",
              "stop-loss",
              "take-profit",
              "trailing-stop",
            ].includes(triggerType)
          ) {
            console.log(`✅ One-time trigger fired, stopping monitor for ${jobKey}`);
            clearInterval(intervalHandle);
            this.priceMonitors.delete(jobKey);
            this.priceState.delete(jobKey);
          }
        }
      } catch (error) {
        console.error(`❌ Price monitor error for workflow ${workflow._id}:`, error);
      }
    }, pollInterval);

    this.priceMonitors.set(jobKey, intervalHandle);
    const typeLabel =
      {
        "price-monitor": "Price Monitor",
        "price-cross-above": "Price Cross Above",
        "price-cross-below": "Price Cross Below",
        "stop-loss": "Stop Loss",
        "take-profit": "Take Profit",
        "trailing-stop": "Trailing Stop",
      }[triggerType] || triggerType;
    console.log(
      `📊 ${typeLabel} scheduled for "${workflow.name}": ${symbol} @ ${targetPrice || stopPrice || "dynamic"}`
    );
  }

  // Unschedule a workflow
  async unscheduleWorkflow(workflowId) {
    try {
      // Stop all timer jobs for this workflow
      for (const [jobKey, job] of this.scheduledJobs.entries()) {
        if (jobKey.startsWith(workflowId)) {
          job.stop();
          this.scheduledJobs.delete(jobKey);
        }
      }

      // Stop all price monitors for this workflow
      for (const [jobKey, intervalHandle] of this.priceMonitors.entries()) {
        if (jobKey.startsWith(workflowId)) {
          clearInterval(intervalHandle);
          this.priceMonitors.delete(jobKey);
        }
      }

      // Update workflow cron state
      const workflow = await Workflow.findById(workflowId);
      if (workflow) {
        await workflow.updateCronState({
          isScheduled: false,
          jobId: null,
        });
      }

      console.log(`🛑 Workflow unscheduled: ${workflowId}`);
    } catch (error) {
      console.error(`❌ Failed to unschedule workflow ${workflowId}:`, error);
    }
  }

  // Execute a workflow
  async executeWorkflow(workflowId, triggerData) {
    let execution = null;

    try {
      const workflow = await Workflow.findById(workflowId);
      if (!workflow || !workflow.isActive) {
        console.warn(`⚠️  Workflow ${workflowId} not found or inactive`);
        return;
      }

      // Create execution record
      execution = new Execution({
        workflowId: workflow._id,
        userId: workflow.userId,
        status: "pending",
        triggerType: triggerData.triggerType,
        triggerData,
        totalNodes: workflow.nodes.length,
        metadata: {
          triggerNodeId: triggerData.triggerNodeId,
          executionMode: "automatic",
        },
      });
      await execution.save();
      await execution.start();

      console.log(`🚀 Executing workflow: ${workflow.name} (${workflow._id})`);

      // Execute nodes in topological order
      await this.executeNodes(workflow, execution, triggerData);

      // Mark execution as complete
      await execution.complete(true);
      await workflow.incrementExecutionCount(true);

      await Log.info("execution", `Workflow executed successfully: ${workflow.name}`, {
        workflowId: workflow._id,
        executionId: execution._id,
        userId: workflow.userId,
      });

      this.emit("workflowExecuted", { workflow, execution });
    } catch (error) {
      console.error(`❌ Workflow execution failed (${workflowId}):`, error);

      if (execution) {
        await execution.complete(false, error.message);
      }

      const workflow = await Workflow.findById(workflowId);
      if (workflow) {
        await workflow.incrementExecutionCount(false);
      }

      await Log.error("execution", `Workflow execution failed: ${workflowId}`, {
        workflowId,
        executionId: execution?._id,
        metadata: { error: error.message },
        stack: error.stack,
      });
    }
  }

  // Execute nodes in workflow order
  async executeNodes(workflow, execution, triggerData) {
    const { nodes, edges } = workflow;
    const triggerNodeId = triggerData.triggerNodeId;

    // Build adjacency list for graph traversal
    const adjacencyList = new Map();
    nodes.forEach((node) => adjacencyList.set(node.id, []));
    edges.forEach((edge) => {
      if (adjacencyList.has(edge.source)) {
        adjacencyList.get(edge.source).push(edge.target);
      }
    });

    // Execute nodes starting from trigger node
    const visited = new Set();
    const queue = [triggerNodeId];

    while (queue.length > 0) {
      const currentNodeId = queue.shift();
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      const node = nodes.find((n) => n.id === currentNodeId);
      if (!node) continue;

      // Execute current node
      const nodeResult = await this.executeNode(node, workflow, execution, triggerData);
      await execution.addNodeResult(nodeResult);

      // If node failed and it's critical, stop execution
      if (nodeResult.status === "failed" && node.type !== "notify") {
        throw new Error(`Node execution failed: ${node.type} - ${nodeResult.error}`);
      }

      // Add connected nodes to queue
      const connectedNodes = adjacencyList.get(currentNodeId) || [];
      queue.push(...connectedNodes);
    }
  }

  // Execute a single node
  async executeNode(node, workflow, execution, triggerData) {
    const startTime = Date.now();
    const result = {
      nodeId: node.id,
      nodeType: node.type,
      status: "running",
      input: node.data,
      executedAt: new Date(),
    };

    try {
      switch (node.type) {
        case "timer":
        case "price-monitor":
        case "price-cross-above":
        case "price-cross-below":
        case "stop-loss":
        case "take-profit":
        case "trailing-stop":
          result.output = { triggered: true, ...triggerData };
          result.status = "success";
          break;

        case "condition":
          result.output = await this.executeConditionNode(node, triggerData);
          result.status = "success";
          break;

        case "buy":
          result.output = await this.executeBuyNode(node, workflow, execution);
          result.status = "success";
          break;

        case "sell":
          result.output = await this.executeSellNode(node, workflow, execution);
          result.status = "success";
          break;

        case "long":
          result.output = await this.executeLongNode(node, workflow, execution, triggerData);
          result.status = "success";
          break;

        case "short":
          result.output = await this.executeShortNode(node, workflow, execution, triggerData);
          result.status = "success";
          break;

        case "close-position":
          result.output = await this.executeClosePositionNode(node, workflow, execution);
          result.status = "success";
          break;

        case "notify":
          result.output = await this.executeNotifyNode(node);
          result.status = "success";
          break;

        default:
          result.status = "skipped";
          result.output = { message: "Unknown node type" };
      }
    } catch (error) {
      result.status = "failed";
      result.error = error.message;
      console.error(`❌ Node execution failed (${node.type}):`, error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // Execute condition node
  async executeConditionNode(node, triggerData) {
    const { operator, leftValue, rightValue } = node.data;

    // Simple evaluation (can be enhanced with expression parser)
    let left = leftValue;
    let right = rightValue;

    // Replace {{currentPrice}} with actual value
    if (triggerData.currentPrice) {
      left = left.toString().replace("{{currentPrice}}", triggerData.currentPrice);
      right = right.toString().replace("{{currentPrice}}", triggerData.currentPrice);
    }

    const leftNum = parseFloat(left);
    const rightNum = parseFloat(right);

    let result = false;
    switch (operator) {
      case ">":
        result = leftNum > rightNum;
        break;
      case "<":
        result = leftNum < rightNum;
        break;
      case ">=":
        result = leftNum >= rightNum;
        break;
      case "<=":
        result = leftNum <= rightNum;
        break;
      case "==":
        result = leftNum === rightNum;
        break;
      case "!=":
        result = leftNum !== rightNum;
        break;
    }

    return { conditionMet: result, leftValue: leftNum, rightValue: rightNum, operator };
  }

  // Execute buy node
  async executeBuyNode(node, workflow, execution) {
    const { symbol, amountType, amount, useCurrentPrice, limitPrice } = node.data;

    // Get current market price
    const marketPrice = await MarketPrice.findOne({ symbol });
    if (!marketPrice) {
      throw new Error(`Market price not found for ${symbol}`);
    }

    const pricePerUnit = useCurrentPrice ? marketPrice.price : limitPrice;

    // Get user and portfolio
    const user = await User.findOne({ uid: workflow.userId });
    if (!user) throw new Error("User not found");

    let portfolio = await Portfolio.findOne({ userId: workflow.userId });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: workflow.userId });
      await portfolio.save();
    }

    // Calculate quantity based on amount type
    let quantity = 0;
    let totalAmount = 0;

    switch (amountType) {
      case "usd":
        totalAmount = amount;
        quantity = totalAmount / pricePerUnit;
        break;
      case "quantity":
        quantity = amount;
        totalAmount = quantity * pricePerUnit;
        break;
      case "percentage":
        totalAmount = (user.wallet.balance * amount) / 100;
        quantity = totalAmount / pricePerUnit;
        break;
    }

    // Check if user has sufficient balance
    if (user.wallet.balance < totalAmount) {
      throw new Error("Insufficient balance");
    }

    // Create transaction
    const transaction = new Transaction({
      userId: workflow.userId,
      workflowId: workflow._id,
      executionId: execution._id,
      type: "buy",
      symbol,
      coinName: marketPrice.name,
      quantity,
      pricePerUnit,
      totalAmount,
      fee: 0,
      netAmount: totalAmount,
      balanceBefore: user.wallet.balance,
      balanceAfter: user.wallet.balance - totalAmount,
      status: "completed",
      metadata: {
        triggerType: execution.triggerType,
        nodeId: node.id,
        priceAtExecution: pricePerUnit,
      },
    });
    await transaction.save();

    // Update user balance
    await user.updateBalance(-totalAmount);

    // Update portfolio
    await portfolio.addHolding(symbol, marketPrice.name, quantity, pricePerUnit);

    console.log(`💰 BUY executed: ${quantity.toFixed(8)} ${symbol} @ $${pricePerUnit.toFixed(2)}`);

    return {
      action: "buy",
      symbol,
      quantity,
      pricePerUnit,
      totalAmount,
      transactionId: transaction._id,
    };
  }

  // Execute sell node
  async executeSellNode(node, workflow, execution) {
    const { symbol, amountType, amount, useCurrentPrice, limitPrice } = node.data;

    // Get current market price
    const marketPrice = await MarketPrice.findOne({ symbol });
    if (!marketPrice) {
      throw new Error(`Market price not found for ${symbol}`);
    }

    const pricePerUnit = useCurrentPrice ? marketPrice.price : limitPrice;

    // Get user and portfolio
    const user = await User.findOne({ uid: workflow.userId });
    if (!user) throw new Error("User not found");

    const portfolio = await Portfolio.findOne({ userId: workflow.userId });
    if (!portfolio) throw new Error("Portfolio not found");

    const holding = portfolio.holdings.find((h) => h.symbol === symbol);
    if (!holding) throw new Error(`No holdings found for ${symbol}`);

    // Calculate quantity based on amount type
    let quantity = 0;

    switch (amountType) {
      case "quantity":
        quantity = amount;
        break;
      case "percentage":
        quantity = (holding.quantity * amount) / 100;
        break;
      case "all":
        quantity = holding.quantity;
        break;
    }

    if (quantity > holding.quantity) {
      throw new Error("Insufficient holdings");
    }

    const totalAmount = quantity * pricePerUnit;

    // Create transaction
    const transaction = new Transaction({
      userId: workflow.userId,
      workflowId: workflow._id,
      executionId: execution._id,
      type: "sell",
      symbol,
      coinName: marketPrice.name,
      quantity,
      pricePerUnit,
      totalAmount,
      fee: 0,
      netAmount: totalAmount,
      balanceBefore: user.wallet.balance,
      balanceAfter: user.wallet.balance + totalAmount,
      status: "completed",
      metadata: {
        triggerType: execution.triggerType,
        nodeId: node.id,
        priceAtExecution: pricePerUnit,
      },
    });
    await transaction.save();

    // Update user balance
    await user.updateBalance(totalAmount);

    // Update portfolio
    await portfolio.removeHolding(symbol, quantity, pricePerUnit);

    console.log(`💸 SELL executed: ${quantity.toFixed(8)} ${symbol} @ $${pricePerUnit.toFixed(2)}`);

    return {
      action: "sell",
      symbol,
      quantity,
      pricePerUnit,
      totalAmount,
      transactionId: transaction._id,
    };
  }

  // Execute long (leveraged buy) node
  async executeLongNode(node, workflow, execution, triggerData) {
    const { symbol, quantity, leverage, exchange = "lighter" } = node.data;

    // Get current market price
    const marketPrice = await MarketPrice.findOne({ symbol });
    if (!marketPrice) {
      throw new Error(`Market price not found for ${symbol}`);
    }

    const entryPrice = triggerData.currentPrice || marketPrice.price;

    // Get user
    const user = await User.findOne({ uid: workflow.userId });
    if (!user) throw new Error("User not found");

    // Calculate position details
    const positionValue = quantity * entryPrice;
    const collateral = positionValue / leverage;

    // Check if user has sufficient balance for collateral
    if (user.wallet.balance < collateral) {
      throw new Error(`Insufficient balance. Need ${collateral.toFixed(2)} USDT for collateral`);
    }

    // Create position
    const position = new Position({
      userId: workflow.userId,
      workflowId: workflow._id,
      executionId: execution._id,
      symbol,
      coinName: marketPrice.name,
      type: "long",
      leverage,
      quantity,
      entryPrice,
      currentPrice: entryPrice,
      collateral,
      positionValue,
      liquidationPrice: 0,
      status: "open",
      exchange,
      metadata: {
        orderType: "market",
        triggerType: execution.triggerType,
        nodeId: node.id,
      },
    });

    // Calculate and set liquidation price
    position.calculateLiquidationPrice();
    await position.save();

    // Deduct collateral from user balance
    await user.updateBalance(-collateral);

    console.log(
      `📈 LONG opened: ${quantity} ${symbol} @ $${entryPrice.toFixed(2)} | ${leverage}x leverage | Liq: $${position.liquidationPrice.toFixed(2)}`
    );

    return {
      action: "long",
      positionId: position._id,
      symbol,
      quantity,
      leverage,
      entryPrice,
      collateral,
      positionValue,
      liquidationPrice: position.liquidationPrice,
      exchange,
    };
  }

  // Execute short (leveraged sell) node
  async executeShortNode(node, workflow, execution, triggerData) {
    const { symbol, quantity, leverage, exchange = "lighter" } = node.data;

    // Get current market price
    const marketPrice = await MarketPrice.findOne({ symbol });
    if (!marketPrice) {
      throw new Error(`Market price not found for ${symbol}`);
    }

    const entryPrice = triggerData.currentPrice || marketPrice.price;

    // Get user
    const user = await User.findOne({ uid: workflow.userId });
    if (!user) throw new Error("User not found");

    // Calculate position details
    const positionValue = quantity * entryPrice;
    const collateral = positionValue / leverage;

    // Check if user has sufficient balance for collateral
    if (user.wallet.balance < collateral) {
      throw new Error(`Insufficient balance. Need ${collateral.toFixed(2)} USDT for collateral`);
    }

    // Create position
    const position = new Position({
      userId: workflow.userId,
      workflowId: workflow._id,
      executionId: execution._id,
      symbol,
      coinName: marketPrice.name,
      type: "short",
      leverage,
      quantity,
      entryPrice,
      currentPrice: entryPrice,
      collateral,
      positionValue,
      liquidationPrice: 0,
      status: "open",
      exchange,
      metadata: {
        orderType: "market",
        triggerType: execution.triggerType,
        nodeId: node.id,
      },
    });

    // Calculate and set liquidation price
    position.calculateLiquidationPrice();
    await position.save();

    // Deduct collateral from user balance
    await user.updateBalance(-collateral);

    console.log(
      `📉 SHORT opened: ${quantity} ${symbol} @ $${entryPrice.toFixed(2)} | ${leverage}x leverage | Liq: $${position.liquidationPrice.toFixed(2)}`
    );

    return {
      action: "short",
      positionId: position._id,
      symbol,
      quantity,
      leverage,
      entryPrice,
      collateral,
      positionValue,
      liquidationPrice: position.liquidationPrice,
      exchange,
    };
  }

  // Execute close position node
  async executeClosePositionNode(node, workflow, execution) {
    const { symbol, positionType = "all" } = node.data;

    // Get current market price
    const marketPrice = await MarketPrice.findOne({ symbol });
    if (!marketPrice) {
      throw new Error(`Market price not found for ${symbol}`);
    }

    const currentPrice = marketPrice.price;

    // Get user
    const user = await User.findOne({ uid: workflow.userId });
    if (!user) throw new Error("User not found");

    // Find open positions
    const query = { userId: workflow.userId, symbol, status: "open" };
    if (positionType !== "all") {
      query.type = positionType;
    }

    const positions = await Position.find(query);

    if (positions.length === 0) {
      throw new Error(`No open ${positionType} positions found for ${symbol}`);
    }

    const closedPositions = [];
    let totalPnL = 0;
    let totalCollateralReturned = 0;

    // Close all matching positions
    for (const position of positions) {
      // Calculate PnL
      position.calculateUnrealizedPnL(currentPrice);
      const pnl = position.unrealizedPnL;
      const collateralReturned = position.collateral + pnl;

      // Close position
      await position.close(currentPrice, "manual");

      // Return collateral + PnL to user
      await user.updateBalance(collateralReturned);

      totalPnL += pnl;
      totalCollateralReturned += collateralReturned;

      closedPositions.push({
        positionId: position._id,
        type: position.type,
        entryPrice: position.entryPrice,
        exitPrice: currentPrice,
        pnl,
        collateralReturned,
      });

      const pnlSign = pnl >= 0 ? "+" : "";
      console.log(
        `🔒 ${position.type.toUpperCase()} closed: ${position.quantity} ${symbol} @ $${currentPrice.toFixed(2)} | PnL: ${pnlSign}$${pnl.toFixed(2)}`
      );
    }

    return {
      action: "close-position",
      symbol,
      positionType,
      closedCount: positions.length,
      totalPnL,
      totalCollateralReturned,
      positions: closedPositions,
    };
  }

  // Execute notify node
  async executeNotifyNode(node) {
    const { message, type } = node.data;

    // In production, this would send actual notifications
    // For now, just log it
    console.log(`🔔 NOTIFICATION [${type}]: ${message}`);

    return { notified: true, message, type };
  }

  // Get next cron run time (simplified)
  getNextCronRun(cronExpression) {
    // In production, use a proper cron parser library
    // For now, just return a future date
    return new Date(Date.now() + 60000); // 1 minute from now
  }

  // Shutdown executor gracefully
  async shutdown() {
    console.log("🛑 Shutting down workflow executor...");

    // Stop all cron jobs
    for (const [jobKey, job] of this.scheduledJobs.entries()) {
      job.stop();
      console.log(`  Stopped job: ${jobKey}`);
    }

    // Clear all price monitors
    for (const [jobKey, intervalHandle] of this.priceMonitors.entries()) {
      clearInterval(intervalHandle);
      console.log(`  Stopped monitor: ${jobKey}`);
    }

    this.scheduledJobs.clear();
    this.priceMonitors.clear();

    console.log("✅ Workflow executor shut down");
  }
}

// Singleton instance
const workflowExecutor = new WorkflowExecutor();

export default workflowExecutor;
