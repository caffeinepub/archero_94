import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface backendInterface {
    getCoins(): Promise<bigint>;
    getHighestChapter(): Promise<bigint>;
    getSelectedHero(): Promise<string>;
    getTotalKills(): Promise<bigint>;
    getTotalRuns(): Promise<bigint>;
    getUpgradeLevel(upgradeId: string): Promise<bigint>;
    isHeroUnlocked(heroId: string): Promise<boolean>;
    purchaseUpgrade(upgradeId: string): Promise<void>;
    recordRunEnd(coins: bigint, kills: bigint, chapter: bigint): Promise<void>;
    selectHero(heroId: string): Promise<void>;
    unlockHero(heroId: string): Promise<void>;
}
