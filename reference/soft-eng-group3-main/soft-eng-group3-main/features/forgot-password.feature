Feature: Forgot password

  Scenario: Forgot password page loads
    Given I open the forgot password page
    Then I should see the forgot password form

  Scenario: Reject malformed email on forgot password form
    Given I open the forgot password page
    When I enter "abc" into the forgot password email field
    And I submit the forgot password form
    Then I should see a forgot password validation message

  Scenario: Reject empty forgot password submission
    Given I open the forgot password page
    When I submit the forgot password form
    Then I should see a forgot password validation message

  Scenario: Accept valid email on forgot password form
    Given I open the forgot password page
    When I enter "test@test.com" into the forgot password email field
    And I submit the forgot password form
    Then I should see a forgot password success message