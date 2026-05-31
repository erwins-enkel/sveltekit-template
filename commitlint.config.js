// Conventional Commits, enforced. release-please reads commit messages to
// build the CHANGELOG and decide version bumps — a malformed message silently
// corrupts that pipeline, so the `commit-msg` hook validates every commit.
export default {
	extends: ['@commitlint/config-conventional']
};
