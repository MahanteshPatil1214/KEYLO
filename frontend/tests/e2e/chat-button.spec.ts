import { test, expect } from "@playwright/test";

test("chat button starts a new conversation for the project", async ({
  page,
}) => {
  // Go to project info page
  await page.goto("/buyer/project");

  // Wait for project card to load
  await expect(page.locator("h2")).toContainText("Project");

  // Click the chat button
  await page.click('button:has-text("Chat with Keylo Concierge")');

  // Should navigate to conversations page
  await expect(page).toHaveURL(/.*conversations/);

  // Chat area should be visible
  await expect(
    page.locator("text=Keylo Concierge")
  ).toBeVisible();
});

test("continue conversation button opens existing conversation", async ({
  page,
}) => {
  await page.goto("/buyer/project");

  // If a conversation already exists, the button text will be different
  const continueBtn = page.locator('button:has-text("Continue Conversation")');
  if ((await continueBtn.count()) > 0) {
    await continueBtn.click();
    await expect(page).toHaveURL(/.*conversations/);
  }
});

test("quick inquiry chips populate the input field", async ({
  page,
}) => {
  await page.goto("/buyer/conversations");

  // Click a quick prompt chip (e.g., Amenities)
  await page.click('text=Amenities');

  // The input should be populated
  await expect(page.locator("textarea")).toContainText("Amenities");
});

test("navigation buttons route to correct pages", async ({ page }) => {
  await page.goto("/buyer");

  // Click Project Information in sidebar
  await page.click('nav a:has-text("Project Information")');
  await expect(page).toHaveURL(/.*project/);

  // Click My Conversations
  await page.click('nav a:has-text("My Conversations")');
  await expect(page).toHaveURL(/.*conversations/);

  // Click My Profile
  await page.click('nav a:has-text("My Profile")');
  await expect(page).toHaveURL(/.*profile/);
});
