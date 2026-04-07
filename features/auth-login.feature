Feature: User login

  Scenario: User logs in with valid credentials
    Given I am on the login page
    When I enter a valid email and password
    And I submit the login form
    Then I should be redirected to the chat page

  Scenario: User cannot log in with invalid password
    Given I am on the login page
    When I enter a valid email and an invalid password
    And I submit the login form
    Then I should see a login error message

  Scenario: User cannot log in with empty fields
    Given I am on the login page
    When I submit the login form with empty credentials
    Then I should see a login validation message