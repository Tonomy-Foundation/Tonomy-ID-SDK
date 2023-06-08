import { execSync } from 'child_process';

export const prepare = (pluginConfig, context) => {
    const { branch, nextRelease, options } = context;

    let tagFormat;

    if (branch.name === 'feature/232-sdk-deployment') {
        tagFormat = `development-${nextRelease.version}`;
    } else {
        tagFormat = `test${nextRelease.version}`;
    }

    execSync(`git tag -a ${tagFormat} -m "chore(release): ${tagFormat}"`);

    // Modify the nextRelease version directly
    nextRelease.version = tagFormat;

    return {
        tagFormat: tagFormat,
    };
};
