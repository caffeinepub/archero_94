import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";

const UPGRADE_IDS = [
  "max_hp",
  "attack_damage",
  "attack_speed",
  "crit_chance",
  "damage_reduction",
] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

const HERO_IDS = ["archer", "mage", "warrior"] as const;
export type HeroId = (typeof HERO_IDS)[number];

export function useCoins() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["progress", "coins"],
    queryFn: async () => {
      if (!actor) return 0;
      const result = await actor.getCoins();
      return Number(result);
    },
    enabled: !!actor,
  });
}

export function useHighestChapter() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["progress", "highestChapter"],
    queryFn: async () => {
      if (!actor) return 1;
      const result = await actor.getHighestChapter();
      return Number(result);
    },
    enabled: !!actor,
  });
}

export function useTotalRuns() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["progress", "totalRuns"],
    queryFn: async () => {
      if (!actor) return 0;
      const result = await actor.getTotalRuns();
      return Number(result);
    },
    enabled: !!actor,
  });
}

export function useTotalKills() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["progress", "totalKills"],
    queryFn: async () => {
      if (!actor) return 0;
      const result = await actor.getTotalKills();
      return Number(result);
    },
    enabled: !!actor,
  });
}

export function useUpgradeLevel(upgradeId: UpgradeId) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["upgrades", upgradeId],
    queryFn: async () => {
      if (!actor) return 0;
      const result = await actor.getUpgradeLevel(upgradeId);
      return Number(result);
    },
    enabled: !!actor,
  });
}

export function useAllUpgradeLevels() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["upgrades", "all"],
    queryFn: async () => {
      if (!actor) return {} as Record<UpgradeId, number>;
      const results = await Promise.all(
        UPGRADE_IDS.map(async (id) => {
          const level = await actor.getUpgradeLevel(id);
          return [id, Number(level)] as [UpgradeId, number];
        }),
      );
      return Object.fromEntries(results) as Record<UpgradeId, number>;
    },
    enabled: !!actor,
  });
}

export function usePurchaseUpgrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (upgradeId: UpgradeId) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.purchaseUpgrade(upgradeId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["upgrades"] });
      void queryClient.invalidateQueries({ queryKey: ["progress", "coins"] });
    },
  });
}

export function useIsHeroUnlocked(heroId: HeroId) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["heroes", heroId, "unlocked"],
    queryFn: async () => {
      if (!actor) return heroId === "archer";
      return actor.isHeroUnlocked(heroId);
    },
    enabled: !!actor,
  });
}

export function useSelectedHero() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["heroes", "selected"],
    queryFn: async () => {
      if (!actor) return "archer";
      return actor.getSelectedHero();
    },
    enabled: !!actor,
  });
}

export function useUnlockHero() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (heroId: HeroId) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.unlockHero(heroId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["heroes"] });
      void queryClient.invalidateQueries({ queryKey: ["progress", "coins"] });
    },
  });
}

export function useSelectHero() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (heroId: HeroId) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.selectHero(heroId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["heroes", "selected"] });
    },
  });
}

export function useRecordRunEnd() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      coins: number;
      kills: number;
      chapter: number;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.recordRunEnd(
        BigInt(params.coins),
        BigInt(params.kills),
        BigInt(params.chapter),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}
