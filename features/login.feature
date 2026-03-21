Feature: User Authentication
  Scenario: Successful login with Google
    Given I am on the "Login" page
    When I click the "Login with Google" button
    Then I should be redirected to the "Choose Your Player" page

  Scenario: Navigation to Chat
    Given I am on the "Choose Your Player" page
    When I click on a player character
    Then I should be redirected to the "Chat" page
