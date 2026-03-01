import Map "mo:core/Map";
import Runtime "mo:core/Runtime";

actor {

  let UPGRADE_IDS : [Text] = ["max_hp", "attack_damage", "attack_speed", "crit_chance", "damage_reduction"];
  let UPGRADE_MAX_LEVEL : Nat = 5;
  let HERO_IDS : [Text] = ["archer", "mage", "warrior"];

  // Coins earned per upgrade level: 20 + level * 10
  func upgradeCost(currentLevel : Nat) : Nat {
    20 + currentLevel * 10;
  };

  func heroCost(heroId : Text) : Nat {
    if (heroId == "mage") { 100 } else if (heroId == "warrior") { 150 } else {
      0;
    };
  };

  // State keyed by principal text
  var coinsMap : Map.Map<Text, Nat> = Map.empty();
  var highestChapterMap : Map.Map<Text, Nat> = Map.empty();
  var totalRunsMap : Map.Map<Text, Nat> = Map.empty();
  var totalKillsMap : Map.Map<Text, Nat> = Map.empty();

  // Upgrade levels: key = principal # "::" # upgradeId
  var upgradeLevelMap : Map.Map<Text, Nat> = Map.empty();

  // Hero unlock: key = principal # "::" # heroId
  var heroUnlockMap : Map.Map<Text, Bool> = Map.empty();

  // Selected hero: key = principal text
  var selectedHeroMap : Map.Map<Text, Text> = Map.empty();

  func upgradeKey(p : Text, upgradeId : Text) : Text {
    p # "::" # upgradeId;
  };

  func heroKey(p : Text, heroId : Text) : Text {
    p # "::" # heroId;
  };

  func requireAuth(caller : Principal) : Text {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous caller not allowed");
    };
    caller.toText();
  };

  func getOrDefault(m : Map.Map<Text, Nat>, key : Text, default_ : Nat) : Nat {
    switch (m.get(key)) {
      case (?v) { v };
      case (null) { default_ };
    };
  };

  // Lazily initialize player defaults on first mutating call
  func ensurePlayer(key : Text) {
    switch (coinsMap.get(key)) {
      case (?_) { () };
      case (null) {
        coinsMap.add(key, 0);
        highestChapterMap.add(key, 0);
        totalRunsMap.add(key, 0);
        totalKillsMap.add(key, 0);
        selectedHeroMap.add(key, "archer");
        heroUnlockMap.add(heroKey(key, "archer"), true);
      };
    };
  };

  public shared query ({ caller }) func getCoins() : async Nat {
    let key = requireAuth(caller);
    getOrDefault(coinsMap, key, 0);
  };

  public shared query ({ caller }) func getHighestChapter() : async Nat {
    let key = requireAuth(caller);
    getOrDefault(highestChapterMap, key, 0);
  };

  public shared query ({ caller }) func getTotalRuns() : async Nat {
    let key = requireAuth(caller);
    getOrDefault(totalRunsMap, key, 0);
  };

  public shared query ({ caller }) func getTotalKills() : async Nat {
    let key = requireAuth(caller);
    getOrDefault(totalKillsMap, key, 0);
  };

  public shared ({ caller }) func recordRunEnd(coins : Nat, kills : Nat, chapter : Nat) : async () {
    let key = requireAuth(caller);
    ensurePlayer(key);

    let current = getOrDefault(coinsMap, key, 0);
    coinsMap.add(key, current + coins);

    let runs = getOrDefault(totalRunsMap, key, 0);
    totalRunsMap.add(key, runs + 1);

    let totalKills = getOrDefault(totalKillsMap, key, 0);
    totalKillsMap.add(key, totalKills + kills);

    let highest = getOrDefault(highestChapterMap, key, 0);
    if (chapter > highest) {
      highestChapterMap.add(key, chapter);
    };
  };

  public shared query ({ caller }) func getUpgradeLevel(upgradeId : Text) : async Nat {
    let key = requireAuth(caller);
    getOrDefault(upgradeLevelMap, upgradeKey(key, upgradeId), 0);
  };

  public shared ({ caller }) func purchaseUpgrade(upgradeId : Text) : async () {
    let key = requireAuth(caller);
    ensurePlayer(key);

    var valid = false;
    for (uid in UPGRADE_IDS.vals()) {
      if (uid == upgradeId) { valid := true };
    };
    if (not valid) {
      Runtime.trap("Invalid upgrade ID");
    };

    let uKey = upgradeKey(key, upgradeId);
    let currentLevel = getOrDefault(upgradeLevelMap, uKey, 0);

    if (currentLevel >= UPGRADE_MAX_LEVEL) {
      Runtime.trap("Upgrade at max level");
    };

    let cost = upgradeCost(currentLevel);
    let coins = getOrDefault(coinsMap, key, 0);

    if (coins < cost) {
      Runtime.trap("Insufficient coins");
    };

    coinsMap.add(key, coins - cost);
    upgradeLevelMap.add(uKey, currentLevel + 1);
  };

  public shared query ({ caller }) func isHeroUnlocked(heroId : Text) : async Bool {
    let key = requireAuth(caller);
    switch (heroUnlockMap.get(heroKey(key, heroId))) {
      case (?v) { v };
      case (null) { false };
    };
  };

  public shared query ({ caller }) func getSelectedHero() : async Text {
    let key = requireAuth(caller);
    switch (selectedHeroMap.get(key)) {
      case (?h) { h };
      case (null) { "archer" };
    };
  };

  public shared ({ caller }) func unlockHero(heroId : Text) : async () {
    let key = requireAuth(caller);
    ensurePlayer(key);

    var valid = false;
    for (hid in HERO_IDS.vals()) {
      if (hid == heroId) { valid := true };
    };
    if (not valid) {
      Runtime.trap("Invalid hero ID");
    };

    if (heroId == "archer") {
      heroUnlockMap.add(heroKey(key, heroId), true);
      return;
    };

    switch (heroUnlockMap.get(heroKey(key, heroId))) {
      case (?true) { Runtime.trap("Hero already unlocked") };
      case (_) { () };
    };

    let cost = heroCost(heroId);
    let coins = getOrDefault(coinsMap, key, 0);

    if (coins < cost) {
      Runtime.trap("Insufficient coins");
    };

    coinsMap.add(key, coins - cost);
    heroUnlockMap.add(heroKey(key, heroId), true);
  };

  public shared ({ caller }) func selectHero(heroId : Text) : async () {
    let key = requireAuth(caller);
    ensurePlayer(key);

    switch (heroUnlockMap.get(heroKey(key, heroId))) {
      case (?true) { selectedHeroMap.add(key, heroId) };
      case (_) { Runtime.trap("Hero not unlocked") };
    };
  };

};
