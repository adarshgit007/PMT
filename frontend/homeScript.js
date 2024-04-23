// Initialize tooltips
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((tooltipTriggerEl) => {
    new bootstrap.Tooltip(tooltipTriggerEl);
});

// Import the functions you need from the SDKs you need
import firebaseConfig from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.3/firebase-app.js';
import { getDatabase, get, set, ref, onValue, remove } from 'https://www.gstatic.com/firebasejs/9.6.3/firebase-database.js';
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// get ref to database services
const db = getDatabase(app);

// Function to fetch projects and update the table
function fetchProjects() {
    const projectsRef = ref(db, 'projects/');
    onValue(projectsRef, (snapshot) => {
        const data = snapshot.val();
        updateProjectsTable(data);
    });
}

// function to check if a project exists
async function projectExists(projectId) {
    const projectRef = ref(db, 'projects/' + projectId);
    const snapshot = await get(projectRef);
    return snapshot.exists();
}

// function to create gist
async function createGist(filename, content) {
    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': 'token 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',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            "files": {
                [filename]: {
                    "content": content
                }
            }
        })
    });
    if (!response.ok) {
        throw new Error(`GitHub Gist API returned ${response.status}`);
    }
    const data = await response.json();
    return data.html_url; // Returns the URL of the created gist
}

// function to export project
async function exportProject(projectId) {
    const projectRef = ref(db, 'projects/' + projectId);
    const projectSnapshot = await get(projectRef);
    if (!projectSnapshot.exists()) {
        console.log('Project does not exist.');
        return;
    }
    const project = projectSnapshot.val();
    const tasksRef = ref(db, 'projects/' + projectId + '/tasks/');
    const tasksSnapshot = await get(tasksRef);
    const tasks = tasksSnapshot.exists() ? tasksSnapshot.val() : {};
    let completedTasks = 0;
    let pendingTasks = '';
    let completedTasksText = '';
    Object.values(tasks).forEach(task => {
        if (task.status === 'Completed') {
            completedTasks++;
            completedTasksText += `- ${task.name}\n`;
        } else {
            pendingTasks += `- ${task.name}\n`;
        }
    });
    const gistContent = `
# ${project.title}
Summary: ${completedTasks}/${Object.keys(tasks).length} tasks completed

## Pending
${pendingTasks}

## Completed
${completedTasksText}
    `;
    try {
        const gistUrl = await createGist(`${projectId}.md`, gistContent);
        console.log(`Gist created at ${gistUrl}`);
    } catch (error) {
        console.error('Error creating gist:', error);
    }
}

// Function to update the projects table with fetched data
function updateProjectsTable(projects) {
    const tableBody = document.querySelector('.project_table tbody');
    tableBody.innerHTML = ''; // Clear existing table rows
    Object.keys(projects).forEach((key, index) => {
        const project = projects[key];
        const row = document.createElement('tr');
        row.innerHTML = `
            <th scope="row">${index + 1}</th>
            <td>${project.title}</td>
            <td>${project.createdDate || new Date().toISOString().split('T')[0]}</td>
            <td><a href="details.html?projectId=${key}">View Details</a></td>
            <td>
                <!-- Call to action buttons -->
                <button class="btn btn-success btn-sm rounded-0" type="button" data-bs-toggle="tooltip" data-bs-placement="top"
                    title="Export" data-project-id="${key}"><i class="fa fa-file-export"></i></button>
                <button class="btn btn-danger btn-sm rounded-0" type="button" data-bs-toggle="tooltip" data-bs-placement="top"
                    title="Delete" data-project-id="${key}"><i class="fa fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Event delegation for export button
document.querySelector('.project_table tbody').addEventListener('click', async function (e) {
    if (e.target && e.target.matches("button.btn-success")) {
        const projectId = e.target.getAttribute('data-project-id');
        try {
            await exportProject(projectId);
        } catch (error) {
            console.error('Error exporting project:', error);
        }
    }
});

// Event delegation for delete button
document.querySelector('.project_table tbody').addEventListener('click', function (e) {
    if (e.target && e.target.matches("button.btn-danger")) {
        const projectId = e.target.getAttribute('data-project-id');
        deleteProject(projectId);
    }
});

// Function to delete a project
function deleteProject(projectId) {
    const projectRef = ref(db, 'projects/' + projectId);
    remove(projectRef).then(() => {
        alert("Project deleted");
        fetchProjects(); // Fetch and display the updated list of projects
    }).catch((error) => {
        console.error("Error deleting project: ", error);
    });
}

// Call fetchProjects on page load and after a new project is submitted
document.addEventListener('DOMContentLoaded', fetchProjects);
document.getElementById("project_submit").addEventListener("click", async function (e) {
    e.preventDefault();
    const projectTitle = document.getElementById("project_title").value.trim();
    const projectDescription = document.getElementById("project_description").value.trim();

    // Check if the project title is empty
    if (projectTitle === '') {
        alert("The project title must be filled out.");
        return; // Stop the function if the project title is empty
    }

    // Use the project title as the projectId, replacing spaces and special characters with underscores
    const projectId = projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // Check if a project with the same title already exists
    if (await projectExists(projectId)) {
        alert("A project with this title already exists.");
        return;
    }

    // Proceed with setting the new project data in Firebase
    const newProjectRef = ref(db, 'projects/' + projectId);
    set(newProjectRef, {
        title: projectTitle,
        description: projectDescription,
    }).then(() => {
        alert("Project added successfully.");
        fetchProjects(); // Fetch and display the updated list of projects

        // Clear the input fields
        document.getElementById("project_title").value = '';
        document.getElementById("project_description").value = '';

        // Hide the modal
        var modalElement = document.getElementById('exampleModal');
        var modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
    }).catch((error) => {
        console.error("Error adding project: ", error);
    });
});

// Event listener to clear the modal input fields when the modal is opened
document.getElementById('exampleModal').addEventListener('show.bs.modal', function () {
    document.getElementById("project_title").value = '';
    document.getElementById("project_description").value = '';
});

// Call fetchProjects on page load
document.addEventListener('DOMContentLoaded', fetchProjects);
