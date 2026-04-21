Feature: User logout

  Scenario: Logged-in user logs out successfully
    Given I am logged in as "test@test.com" with password "12345678"
    And I open the new chat page
    When I click the logout button
    Then I should be redirected to the landing page
