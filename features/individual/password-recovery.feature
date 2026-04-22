Feature: Password recovery
  As a user
  So that I can regain access to my account
  I want to request a reset link and set a new password

  Scenario: A user resets their password from the forgot-password flow
    Given I have a registered solo iteration account
    And I am on the login page
    When I open the forgot password page from login
    And I request a password reset for my account
    Then I should see a preview reset link
    And I open the preview reset link
    And I reset my password to "NewPass123!"
    Then I should be able to log in with my new password
