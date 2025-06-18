// module.exports = (io) => {
//   const express = require('express');
//   const router = express.Router();
//   const { v4: uuidv4 } = require('uuid');
//   const Challenge = require('../models/Challenge');
//   const authMiddleware = require('../middleware/authMiddleware');

//   // Helper function to update challenge status
//   async function updateChallengeStatus(challenge) {
//     const now = new Date();

//     if (!challenge.startTime) {
//       return;
//     }

//     const elapsedSinceStart = (now - challenge.startTime) / 1000; // seconds

//     // Check if challenge duration has passed
//     if (elapsedSinceStart >= challenge.duration) {
//       if (challenge.status !== 'Completed') {
//         challenge.status = 'Completed';
//         await challenge.save();
//         io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       }
//       return;
//     }

//     // Check if all participants have completed
//     const allCompleted = challenge.participants.every(
//       p => p.secondsCompleted >= challenge.duration
//     );

//     if (allCompleted && challenge.status !== 'Completed') {
//       challenge.status = 'Completed';
//       await challenge.save();
//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//     }
//   }

//   // Create Challenge
//   router.post('/create', authMiddleware, async (req, res) => {
//     let { title, duration, totalPoints } = req.body;

//     try {
//       const challengeCode = uuidv4().slice(0, 6).toUpperCase();
//       duration = Number(duration) * 3600; // Convert hours to seconds

//       const challenge = new Challenge({
//         title,
//         duration,
//         totalPoints,
//         creator: req.user.id,
//         challengeCode,
//         participants: [{ user: req.user.id }],
//         status: 'Waiting',
//         startTime: null,
//       });

//       await challenge.save();
//       res.json(challenge);
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Start Challenge
//   // router.post('/:id/start-challenge', authMiddleware, async (req, res) => {
//   //   try {
//   //     const challenge = await Challenge.findById(req.params.id);
//   //     if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//   //     if (challenge.creator.toString() !== req.user.id) {
//   //       return res.status(403).json({ msg: 'Only creator can start the challenge' });
//   //     }

//   //     if (challenge.status !== 'Waiting') {
//   //       return res.status(400).json({ msg: 'Challenge already started or completed' });
//   //     }

//   //     challenge.status = 'Active';
//   //     challenge.startTime = new Date();
//   //     await challenge.save();

//   //     io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//   //     res.json({ msg: 'Challenge started', challenge });
//   //   } catch (err) {
//   //     res.status(500).json({ msg: 'Server error', error: err.message });
//   //   }
//   // });
//   router.post('/:id/start-challenge', authMiddleware, async (req, res) => {
//   try {
//     const challenge = await Challenge.findById(req.params.id);
//     if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//     if (challenge.creator.toString() !== req.user.id) {
//       return res.status(403).json({ msg: 'Only creator can start the challenge' });
//     }

//     if (challenge.status !== 'Waiting') {
//       return res.status(400).json({ msg: 'Challenge already started or completed' });
//     }

//     // Update challenge status and start time
//     challenge.status = 'Active';
//     challenge.startTime = new Date();
    
//     // Automatically start sessions for ALL participants
//     challenge.participants = challenge.participants.map(participant => ({
//       ...participant,
//       currentSessionStart: new Date()
//     }));

//     await challenge.save();

//     io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//     res.json({ msg: 'Challenge started', challenge });
//   } catch (err) {
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

//   // Complete Challenge
//   router.post('/:id/complete', authMiddleware, async (req, res) => {
//     try {
//       const challenge = await Challenge.findById(req.params.id);
//       if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//       if (challenge.creator.toString() !== req.user.id) {
//         return res.status(403).json({ msg: 'Only creator can complete the challenge' });
//       }

//       challenge.status = 'Completed';
//       await challenge.save();

//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ msg: 'Challenge completed', challenge });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Join Challenge
//   router.post('/join', authMiddleware, async (req, res) => {
//     const { challengeCode } = req.body;

//     try {
//       const challenge = await Challenge.findOne({ challengeCode });
//       if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//       if (challenge.participants.find(p => p.user.toString() === req.user.id)) {
//         return res.status(400).json({ msg: 'Already joined' });
//       }

//       if (challenge.participants.length >= 4) {
//         return res.status(400).json({ msg: 'Challenge is full' });
//       }

//       challenge.participants.push({ user: req.user.id });
//       await challenge.save();
      
//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ msg: 'Joined successfully', challenge });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Leave Challenge
//   router.post('/leave', authMiddleware, async (req, res) => {
//     const { challengeId } = req.body;

//     try {
//       const challenge = await Challenge.findById(challengeId);
//       if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//       challenge.participants = challenge.participants.filter(
//         p => p.user.toString() !== req.user.id
//       );

//       await challenge.save();
//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ msg: 'Left challenge' });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Delete Challenge
//   router.delete('/:id', authMiddleware, async (req, res) => {
//     try {
//       const challengeId = req.params.id;

//       if (!challengeId.match(/^[0-9a-fA-F]{24}$/)) {
//         return res.status(400).json({ msg: 'Invalid challenge ID format' });
//       }

//       const challenge = await Challenge.findById(challengeId);
//       if (!challenge) {
//         return res.status(404).json({ msg: 'Challenge not found' });
//       }

//       if (!req.user?.id) {
//         return res.status(401).json({ msg: 'Unauthorized: user ID missing' });
//       }

//       if (challenge.creator.toString() !== req.user.id) {
//         return res.status(403).json({ msg: 'Unauthorized: not challenge creator' });
//       }

//       await Challenge.findByIdAndDelete(challengeId);
//       io.to(`challenge-${challenge._id}`).emit('challenge-deleted', { id: challenge._id });

//       res.json({ msg: 'Deleted successfully' });
//     } catch (err) {
//       console.error('Error deleting challenge:', err);
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Start Session
//   router.post('/:id/start', authMiddleware, async (req, res) => {
//     try {
//       const challenge = await Challenge.findById(req.params.id);
//       if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//       if (challenge.status !== 'Active') {
//         return res.status(400).json({ msg: 'Challenge not active yet' });
//       }

//       const participant = challenge.participants.find(
//         p => p.user.toString() === req.user.id
//       );
//       if (!participant) return res.status(400).json({ msg: 'Not a participant' });

//       if (!participant.currentSessionStart) {
//         participant.currentSessionStart = new Date();
//         await challenge.save();
//         io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       }
//       res.json({ msg: 'Session started' });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Stop Session
//   router.post('/:id/stop', authMiddleware, async (req, res) => {
//     try {
//       const challenge = await Challenge.findById(req.params.id);
//       if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//       if (challenge.status !== 'Active') {
//         return res.status(400).json({ msg: 'Challenge not active yet' });
//       }

//       const participant = challenge.participants.find(
//         p => p.user.toString() === req.user.id
//       );
//       if (!participant || !participant.currentSessionStart) {
//         return res.status(400).json({ msg: 'Session not active' });
//       }

//       const now = new Date();
//       const diff = Math.floor((now - participant.currentSessionStart) / 1000);

//       participant.secondsCompleted = Math.min(
//         participant.secondsCompleted + diff, 
//         challenge.duration
//       );
//       participant.currentSessionStart = null;
//       participant.percentageCompleted = (participant.secondsCompleted / challenge.duration) * 100;
//       participant.pointsEarned = Math.floor((participant.percentageCompleted / 100) * challenge.totalPoints);

//       await challenge.save();
//       await updateChallengeStatus(challenge);

//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ 
//         msg: 'Session stopped', 
//         participant,
//         userTotalTime: participant.secondsCompleted
//       });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Get My Challenges
//   router.get('/my', authMiddleware, async (req, res) => {
//     try {
//       const challenges = await Challenge.find({
//         'participants.user': req.user.id
//       }).populate('participants.user', 'name profileColor');
      
//       res.json(challenges);
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Get Challenge by ID
//   router.get('/:id', authMiddleware, async (req, res) => {
//     try {
//       const challenge = await Challenge.findById(req.params.id)
//         .populate('participants.user', 'name profileColor')
//         .lean();

//       if (!challenge) return res.status(404).json({ msg: 'Not found' });

//       // Normalize participant data
//       challenge.participants = challenge.participants.map(p => ({
//         user: {
//           id: p.user._id.toString(),
//           name: p.user.name,
//           profileColor: p.user.profileColor
//         },
//         secondsCompleted: p.secondsCompleted,
//         currentSessionStart: p.currentSessionStart,
//         points: p.pointsEarned
//       }));

//       // Add user's total time
//       const userParticipant = challenge.participants.find(
//         p => p.user.id === req.user.id
//       );
//       challenge.userTotalTime = userParticipant?.secondsCompleted || 0;

//       res.json(challenge);
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Progress Update (HTTP endpoint)
//   router.post('/:id/progress', authMiddleware, async (req, res) => {
//     try {
//       const challenge = await Challenge.findById(req.params.id);
//       if (!challenge) {
//         return res.status(404).json({ msg: 'Challenge not found' });
//       }

//       const participant = challenge.participants.find(p => 
//         p.user.toString() === req.user.id
//       );

//       if (!participant) {
//         return res.status(403).json({ msg: 'Not a participant in this challenge' });
//       }

//       const now = new Date();
//       if (participant.currentSessionStart) {
//         const sessionStart = new Date(participant.currentSessionStart);
//         const elapsedSeconds = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);
//         participant.secondsCompleted += elapsedSeconds;
//         participant.currentSessionStart = now;
//       }

//       await challenge.save();
//       await updateChallengeStatus(challenge);
      
//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       return res.json({ 
//         msg: 'Progress updated', 
//         challenge,
//         userTotalTime: participant.secondsCompleted
//       });
//     } catch (err) {
//       console.error('Error in progress update:', err);
//       return res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Update Challenge Info
//   router.put('/:id', authMiddleware, async (req, res) => {
//     const { title, duration, totalPoints } = req.body;
//     try {
//       const challenge = await Challenge.findById(req.params.id);
//       if (!challenge) return res.status(404).json({ msg: 'Not found' });
//       if (challenge.creator.toString() !== req.user.id) {
//         return res.status(403).json({ msg: 'Unauthorized' });
//       }

//       if (title) challenge.title = title;
//       if (duration) challenge.duration = duration;
//       if (totalPoints) challenge.totalPoints = totalPoints;

//       await challenge.save();
//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ msg: 'Challenge updated', challenge });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   return router;
// };

// module.exports = (io) => {
//   const express = require('express');
//   const router = express.Router();
//   const { v4: uuidv4 } = require('uuid');
//   const Challenge = require('../models/Challenge');
//   const authMiddleware = require('../middleware/authMiddleware');

//   // Helper functions
//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     return { hours, minutes, formatted: `${hours}h ${minutes}m` };
//   };

//   const formatDate = (date) => {
//     return new Date(date).toLocaleDateString('en-US', {
//       day: 'numeric',
//       month: 'short',
//       year: 'numeric'
//     });
//   };
//   const calculatePoints = (secondsCompleted, totalSeconds, totalPoints) => {
//   const percentage = secondsCompleted / totalSeconds;
//   return Math.floor(percentage * totalPoints);
// };




//   // Create Challenge
//   router.post('/create', authMiddleware, async (req, res) => {
//     const { title, totalHours, durationDays, startDate, description, hashtags, totalPoints } = req.body;

//     try {
//       const challengeCode = uuidv4().slice(0, 6).toUpperCase();
//       const start = new Date(startDate);
//       const end = new Date(start);
//       end.setDate(end.getDate() + Number(durationDays));

//       const challenge = new Challenge({
//         title,
//         description,
//         totalHours: Number(totalHours),
//         durationDays: Number(durationDays),
//         startDate: start,
//         endDate: end,
//         totalPoints: Number(totalPoints), // Use provided points
//         creator: req.user.id,
//         challengeCode,
//         participants: [{ user: req.user.id }],
//         status: 'Waiting',
//         hashtags: hashtags || [],
//       });

//       await challenge.save();
//       res.json(challenge);
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Start Challenge (without auto-starting sessions)
//   router.post('/:id/start-challenge', authMiddleware, async (req, res) => {
//     try {
//       const challenge = await Challenge.findById(req.params.id);
//       if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//       if (challenge.creator.toString() !== req.user.id) {
//         return res.status(403).json({ msg: 'Only creator can start the challenge' });
//       }

//       if (challenge.status !== 'Waiting') {
//         return res.status(400).json({ msg: 'Challenge already started or completed' });
//       }

//       challenge.status = 'Active';
//       challenge.startTime = new Date();
//       await challenge.save();

//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ msg: 'Challenge started', challenge });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Join Challenge
//   router.post('/join', authMiddleware, async (req, res) => {
//     const { challengeCode } = req.body;

//     try {
//       const challenge = await Challenge.findOne({ challengeCode });
//       if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//       if (challenge.participants.find(p => p.user.toString() === req.user.id)) {
//         return res.status(400).json({ msg: 'Already joined' });
//       }

//       if (challenge.participants.length >= 4) {
//         return res.status(400).json({ msg: 'Challenge is full (max 4 participants)' });
//       }

//       challenge.participants.push({ user: req.user.id });
//       await challenge.save();
      
//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ msg: 'Joined successfully', challenge });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Leave Challenge
//   router.post('/leave', authMiddleware, async (req, res) => {
//     const { challengeId } = req.body;

//     try {
//       const challenge = await Challenge.findById(challengeId);
//       if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//       challenge.participants = challenge.participants.filter(
//         p => p.user.toString() !== req.user.id
//       );

//       await challenge.save();
//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ msg: 'Left challenge' });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Delete Challenge
//   router.delete('/:id', authMiddleware, async (req, res) => {
//     try {
//       const challengeId = req.params.id;

//       if (!challengeId.match(/^[0-9a-fA-F]{24}$/)) {
//         return res.status(400).json({ msg: 'Invalid challenge ID format' });
//       }

//       const challenge = await Challenge.findById(challengeId);
//       if (!challenge) {
//         return res.status(404).json({ msg: 'Challenge not found' });
//       }

//       if (!req.user?.id) {
//         return res.status(401).json({ msg: 'Unauthorized: user ID missing' });
//       }

//       if (challenge.creator.toString() !== req.user.id) {
//         return res.status(403).json({ msg: 'Unauthorized: not challenge creator' });
//       }

//       await Challenge.findByIdAndDelete(challengeId);
//       io.to(`challenge-${challenge._id}`).emit('challenge-deleted', { id: challenge._id });

//       res.json({ msg: 'Deleted successfully' });
//     } catch (err) {
//       console.error('Error deleting challenge:', err);
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

 
// router.post('/:id/start', authMiddleware, async (req, res) => {
//   try {
//     const challenge = await Challenge.findById(req.params.id);
//     if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//     if (challenge.status !== 'Active') {
//       return res.status(400).json({ msg: 'Challenge not active yet' });
//     }

//     // Find the participant index for atomic update
//     const participantIndex = challenge.participants.findIndex(
//       p => p.user.toString() === req.user.id
//     );
    
//     if (participantIndex === -1) {
//       return res.status(400).json({ msg: 'Not a participant' });
//     }

//     // Atomic update to prevent race conditions
//     const updatedChallenge = await Challenge.findOneAndUpdate(
//       {
//         _id: req.params.id,
//         [`participants.${participantIndex}.user`]: req.user.id,
//         [`participants.${participantIndex}.currentSessionStart`]: null
//       },
//       {
//         $set: {
//           [`participants.${participantIndex}.currentSessionStart`]: new Date()
//         }
//       },
//       { new: true, populate: ['participants.user', 'creator'] }
//     );

//     if (!updatedChallenge) {
//       return res.status(400).json({ msg: 'Session already active or user not found' });
//     }

//     // Emit both specific session event and full challenge update
//     io.to(`challenge-${challenge._id}`).emit('session-started', {
//       userId: req.user.id,
//       challengeId: challenge._id,
//       startTime: updatedChallenge.participants[participantIndex].currentSessionStart
//     });

//     io.to(`challenge-${challenge._id}`).emit('challenge-updated', updatedChallenge);
    
//     res.json({ 
//       msg: 'Session started',
//       challenge: updatedChallenge
//     });
//   } catch (err) {
//     console.error('Error starting session:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// router.post('/:id/stop', authMiddleware, async (req, res) => {
//   try {
//     const challenge = await Challenge.findById(req.params.id);
//     if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//     const participantIndex = challenge.participants.findIndex(
//       p => p.user.toString() === req.user.id
//     );
    
//     if (participantIndex === -1) {
//       return res.status(400).json({ msg: 'Not a participant' });
//     }

//     const participant = challenge.participants[participantIndex];
//     if (!participant.currentSessionStart) {
//       return res.status(400).json({ msg: 'No active session to stop' });
//     }

//     const now = new Date();
//     const sessionStart = new Date(participant.currentSessionStart);
//     const secondsToAdd = Math.floor((now - sessionStart) / 1000);

//     // Atomic update with all changes
//     const updatedChallenge = await Challenge.findOneAndUpdate(
//       {
//         _id: req.params.id,
//         [`participants.${participantIndex}.user`]: req.user.id,
//         [`participants.${participantIndex}.currentSessionStart`]: { $ne: null }
//       },
//       {
//         $inc: { [`participants.${participantIndex}.secondsCompleted`]: secondsToAdd },
//         $set: { 
//           [`participants.${participantIndex}.currentSessionStart`]: null,
//           [`participants.${participantIndex}.pointsEarned`]: calculatePoints(
//             challenge.participants[participantIndex].secondsCompleted + secondsToAdd
//           )
//         }
//       },
//       { new: true, populate: ['participants.user', 'creator'] }
//     );

//     if (!updatedChallenge) {
//       return res.status(400).json({ msg: 'Session already stopped or user not found' });
//     }

//     // Emit both specific session event and full challenge update
//     io.to(`challenge-${challenge._id}`).emit('session-stopped', {
//       userId: req.user.id,
//       challengeId: challenge._id,
//       secondsAdded: secondsToAdd,
//       totalSeconds: updatedChallenge.participants[participantIndex].secondsCompleted
//     });

//     io.to(`challenge-${challenge._id}`).emit('challenge-updated', updatedChallenge);
    
//     res.json({ 
//       msg: 'Session stopped',
//       secondsAdded: secondsToAdd,
//       totalSeconds: updatedChallenge.participants[participantIndex].secondsCompleted,
//       challenge: updatedChallenge
//     });
//   } catch (err) {
//     console.error('Error stopping session:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

//   // Get My Challenges
//   router.get('/my', authMiddleware, async (req, res) => {
//     try {
//       const challenges = await Challenge.find({
//         'participants.user': req.user.id
//       }).populate('creator participants.user', 'name profileColor');

//       const formattedChallenges = challenges.map(challenge => {
//         const participant = challenge.participants.find(
//           p => p.user._id.toString() === req.user.id
//         );
        
//         return {
//           ...challenge.toObject(),
//           dateRange: `${formatDate(challenge.startDate)} - ${formatDate(challenge.endDate)}`,
//           duration: `${challenge.durationDays} days`,
//           myProgress: participant ? formatTime(participant.secondsCompleted) : null,
//           totalHours: challenge.totalHours,
//           hashtags: challenge.hashtags || []
//         };
//       });

//       res.json(formattedChallenges);
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Get Challenge by ID
//   router.get('/:id', authMiddleware, async (req, res) => {
//     try {
//       const challenge = await Challenge.findById(req.params.id)
//         .populate('creator participants.user', 'name profileColor')
//         .lean();

//       if (!challenge) return res.status(404).json({ msg: 'Not found' });

//       // Format participants data
//       challenge.participants = challenge.participants.map(p => {
//         const time = formatTime(p.secondsCompleted);
//         return {
//           user: p.user,
//           timeCompleted: time,
//           progress: `${time.formatted} / ${challenge.totalHours}h`,
//           percentage: Math.round((p.secondsCompleted / (challenge.totalHours * 3600)) * 100),
//           points: p.pointsEarned
//         };
//       });

//       // Format challenge data
//       const formattedChallenge = {
//         ...challenge,
//         dateRange: `${formatDate(challenge.startDate)} - ${formatDate(challenge.endDate)}`,
//         duration: `${challenge.durationDays} days`,
//         hashtags: challenge.hashtags || [],
//         totalHours: challenge.totalHours,
//         totalPoints: challenge.totalPoints
//       };

//       res.json(formattedChallenge);
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   // Update Challenge Info
//   router.put('/:id', authMiddleware, async (req, res) => {
//     const { title, description, totalHours, durationDays, startDate, totalPoints, hashtags } = req.body;
    
//     try {
//       const challenge = await Challenge.findById(req.params.id);
//       if (!challenge) return res.status(404).json({ msg: 'Not found' });
      
//       if (challenge.creator.toString() !== req.user.id) {
//         return res.status(403).json({ msg: 'Unauthorized' });
//       }

//       if (challenge.status !== 'Waiting') {
//         return res.status(400).json({ msg: 'Can only update waiting challenges' });
//       }

//       if (title) challenge.title = title;
//       if (description) challenge.description = description;
//       if (totalHours) challenge.totalHours = Number(totalHours);
//       if (durationDays) challenge.durationDays = Number(durationDays);
//       if (startDate) {
//         challenge.startDate = new Date(startDate);
//         const end = new Date(challenge.startDate);
//         end.setDate(end.getDate() + challenge.durationDays);
//         challenge.endDate = end;
//       }
//       if (totalPoints) challenge.totalPoints = Number(totalPoints);
//       if (hashtags) challenge.hashtags = hashtags;

//       await challenge.save();
//       io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
//       res.json({ msg: 'Challenge updated', challenge });
//     } catch (err) {
//       res.status(500).json({ msg: 'Server error', error: err.message });
//     }
//   });

//   return router;
// };












module.exports = (io) => {
  const express = require('express');
  const router = express.Router();
  const { v4: uuidv4 } = require('uuid');
  const Challenge = require('../models/Challenge');
  const authMiddleware = require('../middleware/authMiddleware');
  
const SessionLog = require('../models/SessionLog');

  // Helpers
  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return { hours, minutes, formatted: `${hours}h ${minutes}m` };
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // const calculatePoints = (secondsCompleted, totalSeconds, totalPoints) => {
  //   const percentage = secondsCompleted / totalSeconds;
  //   return Math.floor(percentage * totalPoints);
  // };
  const calculatePoints = (secondsCompleted, totalSeconds, totalPoints) => {
  if (!totalSeconds || !totalPoints || !Number.isFinite(secondsCompleted)) return 0;
  const percentage = secondsCompleted / totalSeconds;
  return Math.floor(percentage * totalPoints);
};

  async function updateChallengeStatus(challenge) {
    const now = new Date();

    if (challenge.status === 'Completed') return;

    // Check if end date has passed
    if (now > challenge.endDate) {
      challenge.status = 'Completed';
      await challenge.save();
      io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
      return;
    }

    // Check if all participants have completed their hours
    const allCompleted = challenge.participants.every(
      p => p.secondsCompleted >= challenge.totalHours * 3600
    );

    if (allCompleted) {
      challenge.status = 'Completed';
      await challenge.save();
      io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
    }
  }
  // Get My Challenges
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const challenges = await Challenge.find({
      'participants.user': req.user.id
    }).populate('creator participants.user', 'name profileColor');

    const formattedChallenges = challenges.map(challenge => {
      const participant = challenge.participants.find(
        p => p.user._id.toString() === req.user.id
      );
      
      return {
        ...challenge.toObject(),
        dateRange: `${formatDate(challenge.startDate)} - ${formatDate(challenge.endDate)}`,
        duration: `${challenge.durationDays} days`,
        myProgress: participant ? formatTime(participant.secondsCompleted) : null,
        totalHours: challenge.totalHours,
        hashtags: challenge.hashtags || []
      };
    });

    res.json(formattedChallenges);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});
router.get('/:id/challenges', authMiddleware, async (req, res) => {
  const userId = req.params.id;

  try {
    const challenges = await Challenge.find({
      'participants.user': userId
    }).populate('creator participants.user', 'name profileColor');

    const formattedChallenges = challenges.map(challenge => {
      const participant = challenge.participants.find(
        p => p.user._id.toString() === userId
      );

      return {
        ...challenge.toObject(),
        dateRange: `${formatDate(challenge.startDate)} - ${formatDate(challenge.endDate)}`,
        duration: `${challenge.durationDays} days`,
        myProgress: participant ? formatTime(participant.secondsCompleted) : null,
        totalHours: challenge.totalHours,
        hashtags: challenge.hashtags || []
      };
    });

    res.json(formattedChallenges);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

  // GET /challenges/:id
  router.get('/:id', authMiddleware, async (req, res) => {
    try {
      const challenge = await Challenge.findById(req.params.id)
        .populate('creator participants.user', 'name profileColor')
        .lean();

      if (!challenge) return res.status(404).json({ msg: 'Not found' });

      const totalSeconds = challenge.totalHours * 3600;

      challenge.participants = challenge.participants.map(p => {
        const time = formatTime(p.secondsCompleted || 0);
        const percentage = totalSeconds ? (p.secondsCompleted / totalSeconds) * 100 : 0;
        const points = calculatePoints(p.secondsCompleted, totalSeconds, challenge.totalPoints);

        return {
          user: p.user,
          secondsCompleted: p.secondsCompleted || 0,
          currentSessionStart: p.currentSessionStart || null,
          percentageCompleted: percentage,
          pointsEarned: points,
          timeCompleted: time,
          progress: `${time.formatted} / ${challenge.totalHours}h`
        };
      });

      const formattedChallenge = {
        ...challenge,
        dateRange: `${formatDate(challenge.startDate)} - ${formatDate(challenge.endDate)}`,
        duration: `${challenge.durationDays} days`,
        hashtags: challenge.hashtags || [],
        totalHours: challenge.totalHours,
        totalPoints: challenge.totalPoints
      };

      res.json(formattedChallenge);
    } catch (err) {
      console.error('GET /:id error:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  });

    // Update Challenge Info
  router.put('/:id', authMiddleware, async (req, res) => {
    const { title, description, totalHours, durationDays, startDate, totalPoints, hashtags } = req.body;
    
    try {
      const challenge = await Challenge.findById(req.params.id);
      if (!challenge) return res.status(404).json({ msg: 'Not found' });
      
      if (challenge.creator.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Unauthorized' });
      }

      if (challenge.status !== 'Waiting') {
        return res.status(400).json({ msg: 'Can only update waiting challenges' });
      }

      if (title) challenge.title = title;
      if (description) challenge.description = description;
      if (totalHours) challenge.totalHours = Number(totalHours);
      if (durationDays) challenge.durationDays = Number(durationDays);
      if (startDate) {
        challenge.startDate = new Date(startDate);
        const end = new Date(challenge.startDate);
        end.setDate(end.getDate() + challenge.durationDays);
        challenge.endDate = end;
      }
      if (totalPoints) challenge.totalPoints = Number(totalPoints);
      if (hashtags) challenge.hashtags = hashtags;

      await challenge.save();
      io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
      res.json({ msg: 'Challenge updated', challenge });
    } catch (err) {
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  });

    // Create Challenge
  router.post('/create', authMiddleware, async (req, res) => {
    const { title, totalHours, durationDays, startDate, description, hashtags, totalPoints } = req.body;

    try {
      const challengeCode = uuidv4().slice(0, 6).toUpperCase();
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + Number(durationDays));

      const challenge = new Challenge({
        title,
        description,
        totalHours: Number(totalHours),
        durationDays: Number(durationDays),
        startDate: start,
        endDate: end,
        totalPoints: Number(totalPoints), // Use provided points
        creator: req.user.id,
        challengeCode,
        participants: [{ user: req.user.id }],
        status: 'Waiting',
        hashtags: hashtags || [],
      });

      await challenge.save();
      res.json(challenge);
    } catch (err) {
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  });

  // Start Challenge (without auto-starting sessions)
  router.post('/:id/start-challenge', authMiddleware, async (req, res) => {
    try {
      const challenge = await Challenge.findById(req.params.id);
      if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

      if (challenge.creator.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Only creator can start the challenge' });
      }

      if (challenge.status !== 'Waiting') {
        return res.status(400).json({ msg: 'Challenge already started or completed' });
      }

      challenge.status = 'Active';
      challenge.startTime = new Date();
      await challenge.save();

      io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
      res.json({ msg: 'Challenge started', challenge });
    } catch (err) {
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  });

  // Join Challenge
  router.post('/join', authMiddleware, async (req, res) => {
    const { challengeCode } = req.body;

    try {
      const challenge = await Challenge.findOne({ challengeCode });
      if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

      if (challenge.participants.find(p => p.user.toString() === req.user.id)) {
        return res.status(400).json({ msg: 'Already joined' });
      }

      if (challenge.participants.length >= 4) {
        return res.status(400).json({ msg: 'Challenge is full (max 4 participants)' });
      }

      challenge.participants.push({ user: req.user.id });
      await challenge.save();
      
      io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
      res.json({ msg: 'Joined successfully', challenge });
    } catch (err) {
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  });

  // Leave Challenge
  router.post('/leave', authMiddleware, async (req, res) => {
    const { challengeId } = req.body;

    try {
      const challenge = await Challenge.findById(challengeId);
      if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

      challenge.participants = challenge.participants.filter(
        p => p.user.toString() !== req.user.id
      );

      await challenge.save();
      io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);
      res.json({ msg: 'Left challenge' });
    } catch (err) {
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  });

  // Delete Challenge
  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const challengeId = req.params.id;

      if (!challengeId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ msg: 'Invalid challenge ID format' });
      }

      const challenge = await Challenge.findById(challengeId);
      if (!challenge) {
        return res.status(404).json({ msg: 'Challenge not found' });
      }

      if (!req.user?.id) {
        return res.status(401).json({ msg: 'Unauthorized: user ID missing' });
      }

      if (challenge.creator.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Unauthorized: not challenge creator' });
      }

      await Challenge.findByIdAndDelete(challengeId);
      io.to(`challenge-${challenge._id}`).emit('challenge-deleted', { id: challenge._id });

      res.json({ msg: 'Deleted successfully' });
    } catch (err) {
      console.error('Error deleting challenge:', err);
      res.status(500).json({ msg: 'Server error', error: err.message });
    }
  });

 
// router.post('/:id/start', authMiddleware, async (req, res) => {
//   try {
//     const challenge = await Challenge.findById(req.params.id);
//     if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//     if (challenge.status !== 'Active') {
//       return res.status(400).json({ msg: 'Challenge not active yet' });
//     }

//     const participantIndex = challenge.participants.findIndex(
//       p => p.user.toString() === req.user.id
//     );

//     if (participantIndex === -1) {
//       return res.status(400).json({ msg: 'Not a participant' });
//     }

//     const participant = challenge.participants[participantIndex];

//     if (participant.currentSessionStart) {
//       return res.status(400).json({ msg: 'Session already active' });
//     }

//     participant.currentSessionStart = new Date();

//     await challenge.save();
//     await challenge.populate('participants.user', 'name profileColor');

//     io.to(`challenge-${challenge._id}`).emit('session-started', {
//       userId: req.user.id,
//       challengeId: challenge._id,
//       startTime: participant.currentSessionStart
//     });

//     io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);

//     res.json({
//       msg: 'Session started',
//       challenge
//     });
//   } catch (err) {
//     console.error('Error starting session:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });


// router.post('/:id/stop', authMiddleware, async (req, res) => {
//   try {
//     const challenge = await Challenge.findById(req.params.id);
//     if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

//     const participantIndex = challenge.participants.findIndex(
//       (p) => p.user.toString() === req.user.id
//     );

//     if (participantIndex === -1) {
//       return res.status(400).json({ msg: 'Not a participant' });
//     }

//     const participant = challenge.participants[participantIndex];
//     if (!participant.currentSessionStart) {
//       return res.status(400).json({ msg: 'Session already stopped or never started' });
//     }

//     const now = new Date();
//     const sessionStart = new Date(participant.currentSessionStart);
//     const secondsToAdd = Math.floor((now - sessionStart) / 1000);

//     participant.secondsCompleted += secondsToAdd;
//     participant.currentSessionStart = null;

//     // Cap values
//     const totalSeconds = challenge.totalHours * 3600;
//     participant.secondsCompleted = Math.min(participant.secondsCompleted, totalSeconds);
//     participant.percentageCompleted = Math.min((participant.secondsCompleted / totalSeconds) * 100, 100);
//     participant.pointsEarned = Math.min(
//       Math.floor((participant.percentageCompleted / 100) * challenge.totalPoints),
//       challenge.totalPoints
//     );
//     participant.isComplete = participant.secondsCompleted >= totalSeconds;

//     await challenge.save();
//     await challenge.populate('participants.user', 'name profileColor');

//     io.to(`challenge-${challenge._id}`).emit('session-stopped', {
//       userId: req.user.id,
//       challengeId: challenge._id,
//       secondsAdded: secondsToAdd,
//       totalSeconds: participant.secondsCompleted
//     });

//     io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);

//     res.json({
//       msg: 'Session stopped',
//       secondsAdded: secondsToAdd,
//       totalSeconds: participant.secondsCompleted,
//       challenge
//     });
//   } catch (err) {
//     console.error('❌ Error stopping session:', err);
//     res.status(500).json({ msg: 'Server error', error: err.message });
//   }
// });

// Start session
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

    if (challenge.status !== 'Active') {
      return res.status(400).json({ msg: 'Challenge not active yet' });
    }

    const participantIndex = challenge.participants.findIndex(
      p => p.user.toString() === req.user.id
    );

    if (participantIndex === -1) {
      return res.status(400).json({ msg: 'Not a participant' });
    }

    const participant = challenge.participants[participantIndex];

    if (participant.currentSessionStart) {
      return res.status(400).json({ msg: 'Session already active' });
    }

    participant.currentSessionStart = new Date();

    // Log the session start
    await SessionLog.create({
      user: req.user.id,
      challenge: challenge._id,
      startTime: participant.currentSessionStart,
    });

    await challenge.save();
    await challenge.populate('participants.user', 'name profileColor');

    io.to(`challenge-${challenge._id}`).emit('session-started', {
      userId: req.user.id,
      challengeId: challenge._id,
      startTime: participant.currentSessionStart
    });

    io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);

    res.json({
      msg: 'Session started',
      challenge
    });
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Stop session
router.post('/:id/stop', authMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ msg: 'Challenge not found' });

    const participantIndex = challenge.participants.findIndex(
      (p) => p.user.toString() === req.user.id
    );

    if (participantIndex === -1) {
      return res.status(400).json({ msg: 'Not a participant' });
    }

    const participant = challenge.participants[participantIndex];
    if (!participant.currentSessionStart) {
      return res.status(400).json({ msg: 'Session already stopped or never started' });
    }

    const now = new Date();
    const sessionStart = new Date(participant.currentSessionStart);
    const secondsToAdd = Math.floor((now - sessionStart) / 1000);

    participant.secondsCompleted += secondsToAdd;
    participant.currentSessionStart = null;

    // Cap values
    const totalSeconds = challenge.totalHours * 3600;
    participant.secondsCompleted = Math.min(participant.secondsCompleted, totalSeconds);
    participant.percentageCompleted = Math.min((participant.secondsCompleted / totalSeconds) * 100, 100);
    participant.pointsEarned = Math.min(
      Math.floor((participant.percentageCompleted / 100) * challenge.totalPoints),
      challenge.totalPoints
    );
    participant.isComplete = participant.secondsCompleted >= totalSeconds;

    // Log the session stop
    const latestLog = await SessionLog.findOne({
      user: req.user.id,
      challenge: challenge._id,
      endTime: null,
    }).sort({ createdAt: -1 });

    if (latestLog) {
      latestLog.endTime = now;
      latestLog.duration = secondsToAdd;
      await latestLog.save();
    }

    await challenge.save();
    await challenge.populate('participants.user', 'name profileColor');

    io.to(`challenge-${challenge._id}`).emit('session-stopped', {
      userId: req.user.id,
      challengeId: challenge._id,
      secondsAdded: secondsToAdd,
      totalSeconds: participant.secondsCompleted
    });

    io.to(`challenge-${challenge._id}`).emit('challenge-updated', challenge);

    res.json({
      msg: 'Session stopped',
      secondsAdded: secondsToAdd,
      totalSeconds: participant.secondsCompleted,
      challenge
    });
  } catch (err) {
    console.error('Error stopping session:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});
router.post('/:id/complete', authMiddleware, async (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id; // comes from authMiddleware

  try {
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({ msg: 'Challenge not found' });
    }

    if (challenge.creator.toString() !== userId) {
      return res.status(403).json({ msg: 'Only the creator can complete this challenge' });
    }

    if (challenge.status === 'Completed') {
      return res.status(400).json({ msg: 'Challenge is already completed' });
    }

    challenge.status = 'Completed';
    await challenge.save();

    // Optionally emit to socket.io room
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`challenge-${challenge._id}`).emit('challenge-completed', {
        challengeId: challenge._id,
      });
    }

    res.json({ msg: 'Challenge marked as completed' });
  } catch (err) {
    console.error('Error in POST /challenges/:id/complete:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

return router;
};