function requestPasscode() {
    const studentId = document.getElementById("studentId").value;
    const email = document.getElementById("email").value;

    if (studentId && email) {
        // Generate random passcode / testing
        const passcode = Math.floor(Math.random() * 10000);

        sendEmail(email, passcode);

        // for testing purposes, populate passcode in the passcode input field
        document.getElementById("passcode").value = passcode;
    } else {
        document.getElementById("authenticationStatus").innerHTML = "Please enter both Student ID and Email.";
    }
}

function authenticate() {
    const passcode = document.getElementById("passcode").value;

    if (passcode) {
        // Need to create logic for authenticarion
        document.getElementById("authenticationStatus").innerHTML = "Authentication successful!";
    } else {
        document.getElementById("authenticationStatus").innerHTML = "Please enter the passcode.";
    }
}

function sendEmail(email, passcode) {
    // Code to send email to be done

    });
}
