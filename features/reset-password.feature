Feature: Reset password

  Scenario: Reset password page loads with token
    Given I open the reset password page with token "sampletoken123"
    Then I should see the reset password form

  Scenario: Reject reset with invalid token
    Given I open the reset password page with token "badtoken123"
    When I enter "Nx5@wPm8vQzR" into the reset password field
    And I submit the reset password form
    Then I should see a reset token error message

  Scenario: Reject reset with short password
    Given I open the reset password page with token "badtoken123"
    When I enter "123" into the reset password field
    And I submit the reset password form
    Then I should see a reset password validation message

  Scenario: Reject reset with empty password
    Given I open the reset password page with token "badtoken123"
    When I enter "" into the reset password field
    And I submit the reset password form
    Then I should see a reset password validation message