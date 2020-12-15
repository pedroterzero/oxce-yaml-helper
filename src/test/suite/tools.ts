import { RulesetResolver } from "../../rulesetResolver";

export const waitForExtensionLoad = (rulesetResolver: RulesetResolver): Promise<void> => {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (rulesetResolver.isLoaded()) {
                clearInterval(interval);
                resolve();
            }
        }, 10);
    });
};
