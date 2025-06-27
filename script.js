document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.scroll-container');
  const list = document.querySelector('.testimonial-list');
  const scrollLeft = document.querySelector('.scroll-left');
  const scrollRight = document.querySelector('.scroll-right');

  let scrollSpeed = 2; // Pixels per frame

  let scrollingLeft = false;
  let scrollingRight = false;

  scrollLeft.addEventListener('mouseenter', () => {
    scrollingLeft = true;
    scroll();
  });

  scrollLeft.addEventListener('mouseleave', () => {
    scrollingLeft = false;
  });

  scrollRight.addEventListener('mouseenter', () => {
    scrollingRight = true;
    scroll();
  });

  scrollRight.addEventListener('mouseleave', () => {
    scrollingRight = false;
  });

  function scroll() {
    if (scrollingLeft) {
      list.scrollLeft -= scrollSpeed;
      if (list.scrollLeft <= 0) list.scrollLeft = 0;
      requestAnimationFrame(scroll);
    } else if (scrollingRight) {
      list.scrollLeft += scrollSpeed;
      if (list.scrollLeft >= list.scrollWidth - list.clientWidth) {
        list.scrollLeft = list.scrollWidth - list.clientWidth;
      }
      requestAnimationFrame(scroll);
    }
  }

  // Prevent default drag scrolling
  list.addEventListener('mousedown', (e) => {
    e.preventDefault();
  });

// Profile creation chatbot
  const profileButton = document.getElementById('start-profile-chat');
  const questions = [
    "What's your full name?",
    "What grade are you in? (e.g., 9th, 10th, 11th, 12th)",
    "What skills do you have? (e.g., teamwork, coding, communication)",
    "What are your career interests? (e.g., technology, healthcare, arts)",
    "Write a short bio about yourself."
  ];
  let currentQuestionIndex = 0;
  let profileData = {};
  let userId = null;

  profileButton.addEventListener('click', async () => {
    alert('Profile button clicked! Event listener triggered.');
    try {
        alert('Entering try block: Attempting to fetch user data.');
        const response = await fetch('http://localhost:5050/api/auth/me', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        alert(`Fetch completed. Response status: ${response.status}`);
        if (!response.ok) {
            alert('Response not OK. Prompting user to log in.');
            window.chatbase.sendMessage("Please log in to create a profile.");
            return;
        }
        const userData = await response.json();
        alert(`User data fetched successfully. User ID: ${userData.id}`);
        userId = userId = userData.id;
        currentQuestionIndex = 0;
        profileData = {};
        alert('Sending first question to Chatbase.');
        window.chatbase.sendMessage(questions[0], handleResponse);
    } catch (error) {
        alert('Error occurred in try block.');
        window.chatbase.sendMessage("Error checking login status. Please try again.");
        console.error('Error:', error);
    }
});

  function handleResponse(response) {
    if (!response || !response.text.trim()) {
      window.chatbase.sendMessage("Please provide a valid answer.", handleResponse);
      return;
    }

    if (currentQuestionIndex === 0) profileData.name = response.text;
    else if (currentQuestionIndex === 1) profileData.grade = response.text;
    else if (currentQuestionIndex === 2) profileData.skills = response.text;
    else if (currentQuestionIndex === 3) profileData.interests = response.text;
    else if (currentQuestionIndex === 4) profileData.bio = response.text;

    currentQuestionIndex++;

    if (currentQuestionIndex < questions.length) {
      window.chatbase.sendMessage(questions[currentQuestionIndex], handleResponse);
    } else {
      window.chatbase.sendMessage("Thanks! Creating your profile...");
      saveProfile();
    }
  }

  function saveProfile() {
    if (!userId) {
      window.chatbase.sendMessage("Please log in to create a profile.");
      return;
    }
    fetch('http://localhost:5050/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include', // Include token cookie for authentication
      body: JSON.stringify({
        userId,
        ...profileData,
        status: 'pending'
      })
    })
      .then(response => response.json())
      .then(data => {
        window.chatbase.sendMessage("Profile created! Awaiting counselor approval.");
      })
      .catch(error => {
        window.chatbase.sendMessage("Error creating profile. Please try again.");
        console.error('Error:', error);
      });
  }



});

