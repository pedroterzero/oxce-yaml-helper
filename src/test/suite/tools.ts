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

export const waitForRefresh = async (rulesetResolver: RulesetResolver): Promise<void> => {
    let refreshed = false;
    const wait = () => {
        refreshed = true;
    };

    rulesetResolver.onDidRefresh(wait);

    await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
            if (refreshed) {
                clearInterval(interval);
                resolve();
            }
        }, 10);
    });

    rulesetResolver.removeOnDidRefresh(wait);
};
