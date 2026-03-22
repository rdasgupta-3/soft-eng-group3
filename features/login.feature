Feature: Login

Scenario: Empty login should not proceed
  Given I am on the login page
  When I click the login button
  Then I should see an error message

Scenario: Invalid login should not proceed
  Given I am on the login page
  When I enter an invalid email and password
  And I click the login button
  Then I should see an error message

Scenario: Valid login should proceed
  Given I am on the login page
  When I enter a valid email and password
  And I click the login button
  Then I should go to the select page
