const mongoose = require('mongoose');

const MonthlyLeaderboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  month: { type: String, required: true },
  totalPoints: { type: Number, default: 0 },
  challengesParticipated: { type: Number, default: 0 },
  isWinner: { type: Boolean, default: false },
}, { timestamps: true });

const MonthlyLeaderboard = mongoose.model('MonthlyLeaderboard', MonthlyLeaderboardSchema);

async function run() {
  try {
    await mongoose.connect('mongodb+srv://faizan:abcA12@nodeexpressprojects.2jmnixm.mongodb.net/?retryWrites=true&w=majority&appName=NodeExpressProjects', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Replace these IDs with valid existing ObjectIds from your User and Challenge collections
    const sampleUserId = new mongoose.Types.ObjectId('6852f680379ba69b3a8f386c');
    const sampleChallengeId = new mongoose.Types.ObjectId('6852feec379ba69b3a8f3cd6');

    // Create sample documents
    const samples = [
      {
        userId: sampleUserId,
        challenge: sampleChallengeId,
        month: '2025-06',
        totalPoints: 1200,
        challengesParticipated: 5,
        isWinner: true,
      },
      {
        userId: sampleUserId,
        challenge: sampleChallengeId,
        month: '2025-05',
        totalPoints: 900,
        challengesParticipated: 3,
        isWinner: false,
      }
    ];

    // Insert the sample data
    await MonthlyLeaderboard.insertMany(samples);

    console.log('Sample documents inserted successfully!');
  } catch (err) {
    console.error('Error inserting sample documents:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
