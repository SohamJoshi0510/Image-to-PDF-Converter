(function() {
    const poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (document.getElementById('registrationForm')) {
        document.getElementById('registrationForm').addEventListener('submit', handleRegister);
    }
    if (document.getElementById('signinForm')) {
        document.getElementById('signinForm').addEventListener('submit', handleSignin);
    }
    if (document.getElementById('signOutButton')) {
        document.getElementById('signOutButton').addEventListener('click', handleSignout);
    }

    function handleRegister(event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        const attributeList = [
            new AmazonCognitoIdentity.CognitoUserAttribute({
                Name: 'email',
                Value: email
            })
        ];

        userPool.signUp(email, password, attributeList, null, (err, result) => {
            if (err) {
                alert(err.message);
                return;
            }
            window.location.href = 'verify.html';
        });
    }

    function handleSignin(event) {
        event.preventDefault();

        const authenticationData = {
            Username: document.getElementById('email').value,
            Password: document.getElementById('password').value
        };

        const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
        const userData = {
            Username: document.getElementById('email').value,
            Pool: userPool
        };

        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function(result) {
                window.location.href = 'convert.html';
            },
            onFailure: function(err) {
                alert(err.message);
            }
        });
    }

    function handleSignout() {
        if (userPool.getCurrentUser()) {
            userPool.getCurrentUser().signOut();
        }
        window.location.href = 'index.html';
    }

    // Check auth state on page load
    function checkAuth() {
        const currentUser = userPool.getCurrentUser();
        if (currentUser) {
            currentUser.getSession((err, session) => {
                if (err) {
                    console.log(err);
                    window.location.href = 'signin.html';
                }
            });
        } else {
            if (window.location.href.includes('convert.html')) {
                window.location.href = 'signin.html';
            }
        }
    }

    checkAuth();
})();