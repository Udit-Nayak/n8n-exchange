# Quick Start Guide - New Features 🚀

## Testing the New Features

### 1. Start the Backend Server
```bash
cd backend
npm start
```

**Expected Output:**
```
✅ Server ready!
   HTTP Server: http://localhost:3000
   WebSocket: ws://localhost:3000
   ...
📡 Services running:
   - Price Polling Service
   - Workflow Executor
   - Liquidation Monitor
   - WebSocket Server
```

### 2. Start the Frontend
```bash
cd client
npm run dev
```

**Expected Output:**
```
VITE ready in XXXms
➜  Local:   http://localhost:5173/
```

### 3. Test Live Trades Table

#### On Dashboard:
1. Navigate to http://localhost:5173/
2. Scroll down to see **"💱 Recent Trades"** section
3. You should see:
   - Filter tabs: All / Open / Closed
   - Empty state (if no trades yet): "📊 No trades yet"

#### Create a Test Trade:
1. Create a workflow with:
   - Timer node (every 60 seconds)
   - Long node (BTC, 0.01 quantity, 5x leverage)
2. Activate the workflow
3. Wait for execution
4. **Dashboard should automatically update** showing the new position
5. Watch the **unrealized PnL update in real-time** as prices change

### 4. Test Trade History Page

#### Navigate:
Click **"💱 Trades"** in the top navigation bar

#### Test Features:
1. **Statistics Cards** - Should show:
   - Total Trades
   - Open Positions
   - Win Rate
   - Total Realized PnL
   - Winning/Losing Trades

2. **Filters** - Try filtering by:
   - Status: All / Open / Closed / Liquidated
   - Symbol: All / BTC / ETH
   - Type: All / Long / Short
   - Sort: Newest / Oldest / Highest Profit / Lowest Profit

3. **Table** - Verify all columns display correctly:
   - Type (↑ LONG / ↓ SHORT)
   - Symbol
   - Entry/Exit prices
   - Size, Leverage, Collateral
   - PnL with color coding
   - Status
   - Timestamps

4. **Pagination** - If you have >50 trades:
   - Test Previous/Next buttons
   - Check page counter

### 5. Test Error Handling

#### Test Network Error:
1. Stop the backend server
2. Try to refresh the dashboard
3. **Expected:** Error state with "⚠ Error loading trades" + Retry button

#### Test Invalid Data:
1. Navigate to http://localhost:5173/trades
2. Open browser console
3. Try API call with invalid ID: `/api/positions/invalid-id`
4. **Expected:** 400 error with "Invalid ID" message

### 6. Test Real-Time Updates

#### Open Two Browser Windows:
1. Window 1: Dashboard with Trades Table
2. Window 2: Workflow Builder

#### Test Position Opened:
1. In Window 2: Create and activate a long/short workflow
2. Wait for execution
3. **Window 1 should instantly update** showing new position
4. Check browser console: `Position opened: {...}`

#### Test Position Closed:
1. Create a workflow with close-position node
2. Execute it
3. **Trades table should update immediately**
4. Position moves from "open" to "closed"

#### Test Price Updates:
1. Keep Trades Table open with open positions
2. Watch the **unrealized PnL update every 10 seconds** as prices change
3. No page refresh needed!

### 7. Test Loading States

#### Dashboard Trades Table:
1. Refresh the page
2. **Should see:** "Loading trades..." with pulse animation
3. Then content loads

#### Trade History Page:
1. Navigate to /trades
2. **Should see:** "Loading trade history..." briefly
3. Then stats and table load

### 8. Test Empty States

#### No Trades Yet:
1. If you have no positions, Trades Table shows:
   - 📊 icon
   - "No trades yet"
   - Helpful message

#### Filtered Results:
1. In Trade History, filter by:
   - Status: Liquidated
2. If no liquidated positions:
   - Shows empty state
   - Suggests adjusting filters

### 9. Verify WebSocket Connection

#### Browser Console:
Press F12 and check Console tab for:
```
TradesTable: WebSocket connected
🔌 Client connected: [socket-id]
```

#### Network Tab:
1. Open DevTools → Network tab
2. Filter: WS (WebSocket)
3. Should see active WebSocket connection
4. Monitor real-time messages:
   - `priceUpdate`
   - `positionOpened`
   - `positionClosed`

### 10. Test Navigation

#### Top Navigation:
- ⬡ Dashboard → Main page
- 💱 Trades → Trade history page
- ◎ History → Execution history

#### Links Should:
- Highlight active page (yellow border)
- Work without page reload
- Maintain user session

---

## Common Issues & Solutions

### Issue: "Cannot connect to server"
**Solution:**
- Ensure backend is running on port 3000
- Check MongoDB is running and connected
- Verify `CLIENT_URL=http://localhost:5173` in backend .env

### Issue: "Trades table shows empty"
**Solution:**
- Create and activate a workflow with long/short nodes
- Manually execute workflow from builder
- Wait for timer-based workflow to trigger

### Issue: "WebSocket not connecting"
**Solution:**
- Clear browser cache
- Check browser console for errors
- Ensure CORS is configured correctly in server.js
- Try different browser

### Issue: "Prices not updating"
**Solution:**
- Check price polling service is running
- Backend console should show: "📊 Fetched prices for 2 symbols"
- Verify CoinMarketCap API key (or mock data is working)

### Issue: "Statistics showing 0"
**Solution:**
- Need to close some positions to see realized PnL
- Create workflow with close-position node
- Open positions only show in "unrealized PnL"

---

## Feature Demo Workflow

Want to see everything in action? Create this workflow:

### "Full Demo Workflow"

**Nodes:**
1. **Timer** - Every 30 seconds
2. **Long** - BTC, 0.01 qty, 5x leverage
3. **Delay** - 15 seconds
4. **Close Position** - BTC, type: long

**Flow:** Timer → Long → Delay → Close Position

**What happens:**
1. Opens a long position every 30 seconds
2. Waits 15 seconds
3. Closes the position
4. **Trades table updates in real-time!**
5. **Trade history accumulates**
6. **Statistics update with PnL**

**To Test Real-Time:**
1. Activate this workflow
2. Open Dashboard in one window
3. Open /trades in another window
4. **Watch both update automatically** as positions open/close!

---

## API Testing (Optional)

Use curl or Postman to test endpoints directly:

### Get All Positions
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/positions
```

### Get Open Positions
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/positions/open
```

### Get Statistics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/positions/stats
```

### Filter Positions
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/positions?symbol=BTC&type=long&status=open"
```

---

## Success Indicators ✅

You'll know everything is working when you see:

**Backend Console:**
- `✅ Server ready!`
- `📊 Fetched prices for 2 symbols` (every 10s)
- `🔌 Client connected: [id]` (when you open dashboard)
- `📈 LONG opened: ...` (when position opens)
- `🔒 LONG closed: ...` (when position closes)

**Frontend:**
- Trades table shows positions
- Real-time PnL updates
- No console errors
- Smooth navigation
- Statistics display correctly

**Browser DevTools:**
- WebSocket connection active (Network → WS tab)
- No 404 or 500 errors
- Console shows: "TradesTable: WebSocket connected"

---

Enjoy your new trading features! 🎉
