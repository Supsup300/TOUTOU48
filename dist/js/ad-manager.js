import { MONETIZATION_CONFIG } from "./config.js";

export class AdManager {
  constructor(config = MONETIZATION_CONFIG) {
    this.config = config;
    this.nativeBridge = window.ToutouNativeAds || null;
  }

  simulate(kind, placement) {
    return new Promise((resolve) => {
      let settled = false;
      const complete = (result = { rewarded: kind === "rewarded" }) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      window.dispatchEvent(new CustomEvent("toutou:ad-simulation", {
        detail: { kind, placement, complete }
      }));
      window.setTimeout(() => complete(), kind === "rewarded" ? 3600 : 4600);
    });
  }

  async showRewardedAd({ placement, onRewardGranted, onAdClosed, onAdFailed } = {}) {
    if (!this.config.REWARDED_ADS_ENABLED) {
      const error = new Error("Les récompenses publicitaires sont désactivées.");
      onAdFailed?.(error);
      return { status: "failed", error };
    }

    try {
      if (this.nativeBridge?.showRewarded) {
        const result = await this.nativeBridge.showRewarded({ placement });
        if (result?.rewarded) {
          onRewardGranted?.();
          onAdClosed?.();
          return { status: "rewarded" };
        }
        onAdClosed?.();
        return { status: "closed" };
      }

      const simulated = await this.simulate("rewarded", placement);
      if (simulated.rewarded) {
        onRewardGranted?.();
        onAdClosed?.();
        return { status: "rewarded", simulated: true };
      }
      onAdClosed?.();
      return { status: "closed", simulated: true };
    } catch (error) {
      onAdFailed?.(error);
      return { status: "failed", error };
    }
  }

  async showInterstitial({ gameNumber } = {}) {
    const { ADS_ENABLED, INTERSTITIAL_ADS_ENABLED, INTERSTITIAL_FREQUENCY, REMOVE_ADS_PURCHASED } = this.config;
    if (!ADS_ENABLED || !INTERSTITIAL_ADS_ENABLED || REMOVE_ADS_PURCHASED) return { status: "skipped" };
    if (!gameNumber || gameNumber % INTERSTITIAL_FREQUENCY !== 0) return { status: "skipped" };
    if (!this.nativeBridge?.showInterstitial) {
      await this.simulate("interstitial", "after_game");
      return { status: "shown", simulated: true };
    }
    try {
      await this.nativeBridge.showInterstitial({ placement: "after_game" });
      return { status: "shown" };
    } catch (error) {
      return { status: "failed", error };
    }
  }
}
