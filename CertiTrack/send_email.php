<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $name = $_POST["name"];
    $email = $_POST["email"];
    $message = $_POST["message"];
    
    $to = "admin@certitrack.com, x15025462@student.ncirl.ie";
    $subject = "New Contact Form Submission from $name";
    $email_content = "Name: $name\nEmail: $email\nMessage:\n$message";

    $headers = "From: $email";
    
    if (mail($to, $subject, $email_content, $headers)) {
        echo "success";
    } else {
        echo "error";
    }
}
?>
