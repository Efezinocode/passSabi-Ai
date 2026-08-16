# Connect GitHub and Create a Repository for PassSabi

## Goal
Publish the current PassSabi Lovable project source code to a new GitHub repository using Lovable's built-in Git sync.

## Important distinction
This request is for **Git sync** (backing up / publishing the Lovable project code to GitHub), not the **GitHub API connector** (which lets the app call GitHub endpoints). Git sync is managed through the Lovable editor UI and cannot be triggered from chat.

## Steps the user should follow

1. Open the Lovable editor for this project.
2. Click the **Plus (+)** menu in the chat input area.
3. Select **GitHub → Connect project**.
4. Authorize the **Lovable GitHub App** when prompted.
5. Select the GitHub account or organization where the repo should live.
6. Click **Create Repository** to push the current project state to a new GitHub repo.

## Outcome after connection
- A new repository is created on the chosen GitHub account/organization.
- The current PassSabi codebase is pushed to that repo.
- Future changes made in Lovable will automatically push to GitHub.
- Changes pushed to GitHub will sync back to Lovable.

## Notes
- Lovable does not support importing an existing repo into a project; this flow always creates a fresh repo.
- Only one GitHub account can be connected to a Lovable account at a time.
- Environment variables and backend configuration are not exported with the code; they must be reconfigured in the new hosting environment if self-hosting later.
