# Guest Performance Testing

This directory contains mock data for testing the guest management UI with hundreds of guests.

## Generating Mock Data

Run the performance test script to generate 300 mock guests:

```bash
node scripts/test-guest-performance.cjs
```

This creates `mock-guests.json` with:
- 70% enabled guests (~205)
- 30% disabled guests (~95)
- Varied names, titles, companies, and colors

## Importing into Database

To import the mock data into your database, you can use the Node.js REPL or create a migration script:

```javascript
const { DatabaseService } = require('./lib/services/DatabaseService');
const mockGuests = require('./test-data-functional/mock-guests.json');

const db = DatabaseService.getInstance();
mockGuests.forEach(guest => {
  db.createGuest(guest);
});

console.log(`Imported ${mockGuests.length} guests`);
```

## Performance Testing Checklist

With 300+ guests loaded:

- [ ] Active guests grid scrolls smoothly
- [ ] Disabled guests section expands/collapses without lag
- [ ] Search/autocomplete responds quickly
- [ ] Enabling a disabled guest from search is instant
- [ ] Quick LT action works from any guest card
- [ ] Hover interactions are smooth
- [ ] Resize window - grid adapts responsively

## Cleanup

To remove test data:

```javascript
const { DatabaseService } = require('./lib/services/DatabaseService');
const db = DatabaseService.getInstance();

// Get all guests
const guests = db.getAllGuests();

// Delete all test guests (be careful with this!)
guests.forEach(guest => {
  db.deleteGuest(guest.id);
});
```

Or manually delete the `test-data-functional/data.db` file to reset the database.

