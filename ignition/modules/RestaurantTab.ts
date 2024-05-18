import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ONE_GWEI: bigint = 1_000_000_000n;
const RestaurantTabModule = buildModule("LockModule", (m) => {
  const restaurant = m.getAccount(1);
  const friends = m.getParameter("friends", []);
  const restaurantTab = m.contract("RestaurantTab", [restaurant, friends], { value: ONE_GWEI });
  return { restaurantTab: restaurantTab };
});

export default RestaurantTabModule;
