// fixParticipantsUserIds.js
const mongoose = require('mongoose');
const Challenge = require('./Challenge'); // adjust path as needed

const MONGO_URI = 'mongodb+srv://faizan:abcA12@nodeexpressprojects.2jmnixm.mongodb.net/?retryWrites=true&w=majority&appName=NodeExpressProjects';

async function fixParticipantsUserIds() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');

  const ObjectId = mongoose.Types.ObjectId;

  const challenges = await Challenge.find();
  let fixedCount = 0;

  for (const challenge of challenges) {
    let modified = false;

    for (const participant of challenge.participants) {
      if (typeof participant.user === 'string') {
        participant.user = ObjectId(participant.user);
        modified = true;
      }
    }

    if (modified) {
      await challenge.save();
      fixedCount++;
      console.log(`Fixed challenge ${challenge._id}`);
    }
  }

  console.log(`Fixed ${fixedCount} challenges`);
  await mongoose.disconnect();
}

fixParticipantsUserIds()
  .then(() => console.log('Done'))
  .catch(err => {
    console.error('Error:', err);
    mongoose.disconnect();
  });
