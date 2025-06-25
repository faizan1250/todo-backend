const express = require('express');
const router = express.Router();
const { getTodos, createTodo, updateTodo, deleteTodo , getTodoStats,syncTodos } = require('../controllers/todoController');
const authMiddleware = require('../middleware/authMiddleware'); // assuming you have JWT auth

const todoController = require('../controllers/todoController');
const {getCalendarTodos} = require('../controllers/todoController');
//const { getLeaderboard } = require('../controllers/leaderboardController');


// Toggle subtask


router.use(authMiddleware);

router.get('/', getTodos);
router.get('/stats', getTodoStats); // add this line
router.get('/sync', syncTodos);
router.get('/calendar', getCalendarTodos);
router.post('/', createTodo);
router.put('/:id', updateTodo);
router.patch('/todos/:id/subtasks/:index',  todoController.toggleSubtask);
router.delete('/:id', deleteTodo);
router.post('/join', todoController.joinTodoByCode);
router.post('/:id/complete', todoController.completeSharedTodo);
//router.get('/leaderboard', todoController.getTodoLeaderboard);
router.get('/:id', todoController.getTodoDetails);
router.patch('/:id/status', todoController.updateTodoStatus);
router.get('/shared/leaderboard', todoController.getTodoLeaderboard);
module.exports = router;
