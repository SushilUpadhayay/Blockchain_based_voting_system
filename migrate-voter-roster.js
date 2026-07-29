require('./backend/node_modules/dotenv').config({ path: require('path').join(__dirname, 'backend', '.env') });
const mongoose = require('./backend/node_modules/mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }

mongoose.connect(MONGO_URI).then(async () => {
  const col = mongoose.connection.db.collection('voterrosters');
  const total = await col.countDocuments();

  const staleFilter = {
    $or: [
      { citizenshipNumber: { $exists: false } },
      { citizenshipNumber: null },
      { citizenshipNumber: '' },
      { dateOfBirth: { $exists: false } },
      { dateOfBirth: null },
      { dateOfBirth: '' },
    ],
  };

  const stale = await col.countDocuments(staleFilter);

  if (stale === 0) {
    console.log('No stale documents found. Total documents: ' + total);
  } else {
    const result = await col.deleteMany(staleFilter);
    console.log('Removed ' + result.deletedCount + ' stale VoterRoster document(s) missing citizenshipNumber or dateOfBirth.');
    const remaining = await col.countDocuments();
    console.log('Documents before: ' + total + ' -> after: ' + remaining);
    console.log('Affected voters must be re-uploaded with the new 5-column Excel format.');
  }

  await mongoose.disconnect();
  console.log('Migration complete.');
}).catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
