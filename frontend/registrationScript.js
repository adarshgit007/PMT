var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});

// Import the functions you need from the SDKs you need
import firebaseConfig from './firebaseConfig.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.3/firebase-app.js';
import { getDatabase, set, ref } from 'https://www.gstatic.com/firebasejs/9.6.3/firebase-database.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.6.3/firebase-auth.js';
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// get ref to database services
const db = getDatabase(app);

// Initialize Firebase Authentication
const auth = getAuth(app);

document.getElementById("register").addEventListener("click", function (e) {
    e.preventDefault();

    var email = document.getElementById("email").value;
    var password = document.getElementById("password").value;
    var confirm_password = document.getElementById("confirm_password").value;

    if (password === confirm_password) {
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in 
                var user = userCredential.user;
                // Store additional user info in Realtime Database
                set(ref(db, 'user-registration/' + user.uid), {
                    name: document.getElementById("name").value,
                    email: email,
                    phone: document.getElementById("phone").value,
                    // Do not store passwords in the database
                }).then(() => {
                    alert("Registration successful!");
                }).catch((error) => {
                    console.error("Error storing user data:", error);
                });
            })
            .catch((error) => {
                var errorCode = error.code;
                var errorMessage = error.message;
                // .. handle errors
                alert(errorMessage);
            });
    } else {
        alert("Passwords do not match.");
    }
});
