import { getSupabaseClient } from "../lib/supabase/client.js";
import { mapDatabaseRow } from "./academicDataService.js";

export function createSubscriptionService(client = getSupabaseClient()) {
  async function read(request) {
    const { data, error } = await request;
    if (error) throw error;
    return mapDatabaseRow(data);
  }
  return {
    plans: async () => {
      const plans = await read(client.from("subscription_plans").select("*,plan_features(feature_code,value,feature_definitions(name))").eq("status", "active").order("unit_price"));
      return plans.map(plan => ({ ...plan, planFeatures: mapDatabaseRow(plan.planFeatures || []) }));
    },
    entitlements: (schoolId) => read(client.rpc("get_school_entitlements", { requested_school: schoolId })),
  };
}
