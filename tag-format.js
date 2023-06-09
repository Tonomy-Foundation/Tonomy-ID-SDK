import { execSync } from 'child_process';

module.exports = async (pluginConfig, context) => {
    const { branch, nextRelease } = context;

    let tagFormat;

    if (branch.name === 'feature/232-sdk-deployment') {
        tagFormat = `development-${nextRelease.version}`;
    } else {
        tagFormat = `v${nextRelease.version}`;
    }

    execSync(`git tag -a ${tagFormat} -m "chore(release): ${tagFormat}"`);

    return tagFormat;
};