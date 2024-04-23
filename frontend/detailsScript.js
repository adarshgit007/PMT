var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});

// Import the functions you need from the SDKs you need
import firebaseConfig from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.3/firebase-app.js';
import { getDatabase, get, set, ref, onValue, remove } from 'https://www.gstatic.com/firebasejs/9.6.3/firebase-database.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// get ref to database services
const db = getDatabase(app);

// Get the project ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');

// Function to fetch project title and display it
function fetchProjectTitle() {
    const projectRef = ref(db, 'projects/' + projectId);
    get(projectRef).then((snapshot) => {
        if (snapshot.exists()) {
            const project = snapshot.val();
            document.getElementById("Project_detail_title").value = project.title;
        } else {
            console.log("No data available");
        }
    }).catch((error) => {
        console.error("Error fetching project: ", error);
    });
}

// Function to fetch tasks and update the table
function fetchTasks() {
    const tasksRef = ref(db, 'projects/' + projectId + '/tasks/');
    onValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        updateTasksTable(data);
    });
}

// Function to check if a task exists
async function checkIfTaskExists(taskId) {
    const taskRef = ref(db, 'projects/' + projectId + '/tasks/' + taskId);
    const taskSnapshot = await get(taskRef);
    return taskSnapshot.exists();
}

// Function to update the tasks table with fetched data
function updateTasksTable(tasks) {
    const tableBody = document.querySelector('.tasks_table tbody');
    tableBody.innerHTML = ''; // Clear existing table rows
    Object.keys(tasks).forEach((key, index) => {
        const task = tasks[key];
        const row = document.createElement('tr');
        let statusText = '';
        if (task.status === 'completed') {
            statusText = 'Completed';
        } else if (task.status === 'pending') {
            statusText = 'Pending';
        } else {
            statusText = task.status;
        }
        row.innerHTML = `
            <th scope="row">${index + 1}</th>
            <td>${task.name}</td>
            <td>${statusText}</td>
            <td>${task.createdDate || new Date().toISOString().split('T')[0]}</td>
            <td>${task.dueDate || new Date().toISOString().split('T')[0]}</td>
            <td>
                <!-- Call to action buttons -->
                <button class="btn btn-primary btn-sm rounded-0 edit-btn" id="edit-task" type="button" data-bs-toggle="tooltip" data-bs-placement="top"
                    title="Edit" data-task-id="${key}"><i class="fa fa-edit"></i></button>
                <button class="btn btn-danger btn-sm rounded-0" id="delete-task" type="button" data-bs-toggle="tooltip" data-bs-placement="top"
                    title="Delete" data-task-id="${key}"><i class="fa fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    // Add event listeners to edit buttons after they are created
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function () {
            const taskId = this.getAttribute('data-task-id');
            editTask(taskId);
        });
    });
    // Add event listeners to delete buttons after they are created
    document.querySelectorAll('.btn-danger').forEach(button => {
        button.addEventListener('click', function () {
            const taskId = this.getAttribute('data-task-id');
            // Store the task ID in the confirm delete button
            document.getElementById('confirmDelete').setAttribute('data-task-id', taskId);
            // Show the confirmation modal
            var deleteModalElement = document.getElementById('deleteConfirmationModal');
            var deleteModalInstance = new bootstrap.Modal(deleteModalElement);
            deleteModalInstance.show();
        });
    });
}

// Function to edit a task
function editTask(taskId) {
    const taskRef = ref(db, 'projects/' + projectId + '/tasks/' + taskId);
    get(taskRef).then((snapshot) => {
        if (snapshot.exists()) {
            const task = snapshot.val();
            // Set the modal title
            document.querySelector('#editTaskModalLabel').textContent = 'Edit Task';
            // Populate the form with existing task data
            document.getElementById("edit_task_name").value = task.name;
            document.getElementById("edit_task_description").value = task.description || '';
            document.getElementById("edit_task_cdate").value = task.createdDate || '';
            document.getElementById("edit_task_ddate").value = task.dueDate || '';
            document.getElementById("edit_task_status").value = task.status || '';
            // Show the modal
            var modalElement = document.getElementById('editTaskModal');
            var modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();
            // Set a data attribute on the save button with the task ID
            document.getElementById("edit_task_submit").setAttribute('data-task-id', taskId);
        } else {
            console.log("No data available");
        }
    }).catch((error) => {
        console.error("Error fetching task: ", error);
    });
}

// Function to delete a task
function deleteTask(taskId) {
    const taskRef = ref(db, 'projects/' + projectId + '/tasks/' + taskId);
    remove(taskRef).then(() => {
        // Task deleted successfully
        alert("Task deleted");
        // Hide the confirmation modal
        var deleteModalElement = document.getElementById('deleteConfirmationModal');
        var deleteModalInstance = new bootstrap.Modal(deleteModalElement);
        deleteModalInstance.hide();
        // Refresh the page to show updated tasks list
        location.reload();
    }).catch((error) => {
        console.error("Error deleting task: ", error);
    });
}

// Event listener for the confirmDelete button to execute the deleteTask function
document.getElementById('confirmDelete').addEventListener('click', async function () {
    const taskId = this.getAttribute('data-task-id');
    // Check if the task still exists (you'll need to implement this logic)
    const taskExists = await checkIfTaskExists(taskId); // Replace with your actual function
    if (taskExists) {
        deleteTask(taskId);
        // Hide the confirmation modal
        var deleteModalElement = document.getElementById('deleteConfirmationModal');
        var deleteModalInstance = new bootstrap.Modal(deleteModalElement);
        deleteModalInstance.hide();
        // Remove the data-task-id attribute
        this.removeAttribute('data-task-id');
    } else {
        // Task no longer exists (already deleted or modified)
        console.log('Task does not exist.');
    }
});

// Call fetchTasks on page load and after a new task is submitted
document.addEventListener('DOMContentLoaded', fetchTasks);
document.getElementById("add_task_submit").addEventListener("click", function (e) {
    e.preventDefault();
    const taskId = e.target.getAttribute('data-task-id'); // Get the task ID
    const taskName = document.getElementById("task_name").value.trim();
    const taskDescription = document.getElementById("task_description").value.trim();
    const taskCreatedDate = document.getElementById("task_cdate").value.trim();
    const taskDueDate = document.getElementById("task_ddate").value.trim();
    const taskStatus = document.getElementById("task_status").value;

    // Check if the task name or other fields are empty
    if (!taskName || !taskDescription || !taskCreatedDate || !taskDueDate || taskStatus === "Select Completion Status") {
        alert("All fields must be filled out.");
        return; // Stop the function if any field is empty
    }

    // Determine if we're adding a new task or updating an existing one
    const isUpdating = taskId !== null && taskId !== '';

    // Generate a new task ID
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const newTaskId = `task-${year}${month}${day}-${hours}${minutes}${seconds}`;

    const taskRef = isUpdating ? ref(db, 'projects/' + projectId + '/tasks/' + taskId) : ref(db, 'projects/' + projectId + '/tasks/' + newTaskId);

    set(taskRef, {
        name: taskName,
        description: taskDescription,
        createdDate: taskCreatedDate,
        dueDate: taskDueDate,
        status: taskStatus
    }).then(() => {
        alert(isUpdating ? "Task updated successfully." : "Task added successfully.");
        fetchTasks(); // Fetch and display the updated list of tasks

        // Hide the modal
        var modalElement = document.getElementById('exampleModal');
        var modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
    }).catch((error) => {
        console.error("Error adding/updating task: ", error);
    });
});

// Editing a task
document.getElementById("edit_task_submit").addEventListener("click", function (e) {
    e.preventDefault();
    const taskId = e.target.getAttribute('data-task-id'); // Get the task ID
    const taskName = document.getElementById("edit_task_name").value.trim();
    const taskDescription = document.getElementById("edit_task_description").value.trim();
    const taskCreatedDate = document.getElementById("edit_task_cdate").value.trim();
    const taskDueDate = document.getElementById("edit_task_ddate").value.trim();
    const taskStatus = document.getElementById("edit_task_status").value;

    // Check if the task name or other fields are empty
    if (!taskName || !taskDescription || !taskCreatedDate || !taskDueDate || taskStatus === "Select Completion Status") {
        alert("All fields must be filled out.");
        return; // Stop the function if any field is empty
    }

    // Determine if we're adding a new task or updating an existing one
    const isUpdating = taskId !== null && taskId !== '';

    const taskRef = ref(db, 'projects/' + projectId + '/tasks/' + taskId);

    set(taskRef, {
        name: taskName,
        description: taskDescription,
        createdDate: taskCreatedDate,
        dueDate: taskDueDate,
        status: taskStatus
    }).then(() => {
        alert(isUpdating ? "Task updated successfully." : "Task added successfully.");
        fetchTasks(); // Fetch and display the updated list of tasks

        // Hide the modal
        var modalElement = document.getElementById('editTaskModal');
        var modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
    }).catch((error) => {
        console.error("Error adding/updating task: ", error);
    });
});

// Event listener to clear the modal input fields when the modal is opened
document.getElementById('exampleModal').addEventListener('show.bs.modal', function (event) {
    // Clear the input fields for adding a new task
    document.getElementById("task_name").value = '';
    document.getElementById("task_description").value = '';
    document.getElementById("task_cdate").value = '';
    document.getElementById("task_ddate").value = '';
    document.getElementById("task_status").value = 'Select Completion Status';
    // Set the modal title for adding a new task
    document.querySelector('.modal-title').textContent = 'Add Task';
});

// Call fetchTasks and fetchProjectTitle on page load
document.addEventListener('DOMContentLoaded', function () {
    fetchTasks();
    fetchProjectTitle();
});
