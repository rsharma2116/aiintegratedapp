document.addEventListener("DOMContentLoaded", () => {
    // Initialize elements
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const loginErrorMsg = document.getElementById("login-error-msg");
    const registerErrorMsg = document.getElementById("register-error-msg");
  
    // Handle login form submission
    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }
  
    // Handle register form submission
    if (registerForm) {
      registerForm.addEventListener("submit", handleRegister);
    }
  
    // Handle user icon expansion
    const userIcon = document.getElementById("userIcon");
    if (userIcon) {
      userIcon.addEventListener("click", () => {
        const userMenu = document.getElementById("userMenu");
        userMenu.style.display = userMenu.style.display === "block" ? "none" : "block";
      });
    }
  
    // Check authentication status for protected routes
    if (window.location.pathname === "/dashboard") {
      checkAuthStatus();
      initializeCredits();
    }
  });
  
  async function handleLogin(event) {
    event.preventDefault();
  
    const form = event.target;
    const errorMsg = document.getElementById("login-error-msg");
    const submitButton = form.querySelector("button[type='submit']");
  
    // Get form data
    const username = form.username.value.trim();
    const password = form.password.value.trim();
  
    // Validate inputs
    if (!username || !password) {
      showError(errorMsg, "Please fill in all fields");
      return;
    }
  
    try {
      // Disable button during request
      submitButton.disabled = true;
  
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // Store token securely
        setAuthToken(data.access_token);
  
        // Initialize credits
        initializeCredits();
  
        // Redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        showError(errorMsg, data.detail || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      showError(errorMsg, "Error connecting to server");
    } finally {
      submitButton.disabled = false;
    }
  }
  
  async function handleRegister(event) {
    event.preventDefault();
  
    const form = event.target;
    const errorMsg = document.getElementById("register-error-msg");
    const submitButton = form.querySelector("button[type='submit']");
  
    // Get form data
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
  
    // Validate inputs
    if (!username || !email || !password) {
      showError(errorMsg, "Please fill in all fields");
      return;
    }
  
    try {
      submitButton.disabled = true;
  
      const response = await fetch("/api/auth/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
        credentials: "include"
      });
  
      const data = await response.json();
  
      if (response.ok) {
        alert("Registration successful! Please login.");
        window.location.href = "/login";
      } else {
        showError(errorMsg, data.detail || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      showError(errorMsg, "Error connecting to server");
    } finally {
      submitButton.disabled = false;
    }
  }
  
  async function checkAuthStatus() {
    const token = getAuthToken();
  
    if (!token) {
      redirectToLogin();
      return;
    }
  
    try {
      const response = await fetch("/api/auth/verify/", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        redirectToLogin();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      redirectToLogin();
    }
  }
  
  // Initialize credits
  function initializeCredits() {
    let userCredits = parseInt(localStorage.getItem("credits")) || 20;
    updateCreditsDisplay(userCredits);
  }
  
  // Deduct credits on each message
  async function handleChatSubmit(event) {
    event.preventDefault();
  
    let userCredits = parseInt(localStorage.getItem("credits")) || 20;
  
    if (userCredits <= 0) {
      alert("You have no credits left. Please upgrade your plan.");
      return;
    }
  
    // Deduct credits for each chat
    userCredits -= 2;
    localStorage.setItem("credits", userCredits);
  
    // Check if 60% of credits have been consumed
    if (userCredits <= 12) {
      showPopupNotification("You're running low on credits! Only " + userCredits + " credits remaining.");
    }
  
    // Continue with the chat request
    await processChatRequest();
  
    // Update credits display
    updateCreditsDisplay(userCredits);
  }
  
  // Update credits display
  function updateCreditsDisplay(credits) {
    const creditsElement = document.getElementById("credits-display");
    if (creditsElement) {
      creditsElement.textContent = `Credits: ${credits}`;
    }
  }
  
  // Show the popup notification for low credits
  function showPopupNotification(message) {
    const popup = document.createElement('div');
    popup.className = 'popup-notification';
    popup.innerHTML = message;
    document.body.appendChild(popup);
  
    setTimeout(() => {
      popup.style.display = 'none';
    }, 5000); // Hide the popup after 5 seconds
  }
  
  function setAuthToken(token) {
    // Store in localStorage
    localStorage.setItem("token", token);
  
    // Also set as cookie for HTTP-only security
    document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict` + 
                      (location.protocol === "https:" ? "; Secure" : "");
  }
  
  function getAuthToken() {
    // Check localStorage first
    const token = localStorage.getItem("token");
    if (token) return token;
  
    // Fallback to cookie
    const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
  
    return cookieToken;
  }
  
  function redirectToLogin() {
    // Clear auth data before redirecting
    localStorage.removeItem("token");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  }
  
  function showError(element, message) {
    if (!element) return;
  
    element.textContent = message;
    element.style.display = "block";
  
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      element.style.display = "none";
    }, 5000);
  }
  