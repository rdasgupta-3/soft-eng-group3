Feature: Account access
  As a user
  So that I can enter and leave the system safely
  I want to sign up, log in, choose a persona, and log out

  Scenario: A new user creates an account, logs in, and logs out
    Given I am on the signup page
    When I create a solo iteration account through the signup form
    Then I should return to the login page after signup
    When I log in with the newly created account
    And I choose the "professional" persona from the selection page
    Then I should be on the chat workspace
    When I log out from the chat workspace
    Then I should be on the login page
