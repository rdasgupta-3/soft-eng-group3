Feature: Routing and page navigation

  Scenario: Login page loads successfully
    Given I open a fresh browser session
    When I navigate to the login page
    Then I should see the login form

  Scenario: Forgot password page loads successfully
    Given I open a fresh browser session
    When I navigate to the forgot password page
    Then I should see the forgot password form

  Scenario: Reset password page loads with token
    Given I open a fresh browser session
    When I navigate to the reset password page with token "sampletoken123"
    Then I should see the reset password form