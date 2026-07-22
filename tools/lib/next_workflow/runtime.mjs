import { createAgentLauncher } from "./agents.mjs";
import { createSideEffectGateway } from "./authority.mjs";
import { createNodeDescriptorPinnedExecutor, createOperationalProviderAdapter } from "./providers.mjs";

const PROVIDER_EFFECT_VARIANTS = Object.freeze(["provider_effect", "agent_launch"]);

export function createNextWorkflowRuntime({
  store,
  registryProvider,
  sourceProvider,
  activationProvider,
  activationVerifier,
  currentCandidateProvider,
  reconciliationAuthorizer,
  receiptVerifier,
  approvalVerifier,
  providerObserver,
  cliExecutor,
  apiTransport,
  localTransport,
  secretResolver,
  endpointObservationProvider,
  effectAdapters = {},
  agentObservationVerifier,
  containment,
  clock = () => new Date().toISOString(),
  idFactory,
} = {}) {
  if (!store || typeof store.listUnresolvedEffects !== "function" || typeof registryProvider !== "function" || typeof currentCandidateProvider !== "function") throw new Error("NEXT_WORKFLOW_RUNTIME_DEPENDENCY_REQUIRED");
  const providerAdapter = createOperationalProviderAdapter({
    registryProvider,
    observer: providerObserver,
    cliExecutor: cliExecutor ?? createNodeDescriptorPinnedExecutor(),
    dispatchFenceGuard: ({ authority_epoch: authorityEpoch, fencing_token: fencingToken }) => {
      store.assertAuthorityEpoch({ authorityEpoch });
      return { current: true, authority_epoch: authorityEpoch, fencing_token: fencingToken };
    },
    apiTransport,
    localTransport,
    secretResolver,
    endpointObservationProvider,
    clock,
  });
  const adapters = { ...effectAdapters };
  for (const variant of PROVIDER_EFFECT_VARIANTS) {
    if (adapters[variant] !== undefined) throw new Error(`PROVIDER_GATEWAY_ADAPTER_OVERRIDE_FORBIDDEN:${variant}`);
    adapters[variant] = providerAdapter;
  }
  const gateway = createSideEffectGateway({ store, sourceProvider, activationProvider, activationVerifier, currentCandidateProvider, reconciliationAuthorizer, adapters, receiptVerifier, approvalVerifier, clock, ...(idFactory ? { idFactory } : {}) });
  const launcher = agentObservationVerifier && containment
    ? createAgentLauncher({ gateway, store, registryProvider, observationVerifier: agentObservationVerifier, containment, clock, ...(idFactory ? { idFactory } : {}) })
    : null;

  return Object.freeze({
    async previewEffect(effect) {
      return gateway.preview(structuredClone(effect));
    },
    async executeEffect(effect) {
      return gateway.execute(structuredClone(effect));
    },
    async launchAgent(input) {
      if (!launcher) throw new Error("AGENT_LAUNCH_RUNTIME_NOT_CONFIGURED");
      return launcher.launch(structuredClone(input));
    },
    async reconcilePending({ targetId, limit = 100 } = {}) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error("RECONCILIATION_LIMIT_INVALID");
      const unresolved = store.listUnresolvedEffects({ targetId }).slice(0, limit);
      const results = [];
      for (const item of unresolved) {
        try {
          results.push(await gateway.reconcile(item.effect_id));
        } catch (error) {
          results.push({ effect_id: item.effect_id, state: "MANUAL_RECOVERY_REQUIRED", code: error?.message ?? "RECONCILIATION_FAILED" });
        }
      }
      return { attempted: unresolved.length, remaining: store.listUnresolvedEffects({ targetId }).length, results };
    },
    status() {
      const registry = registryProvider();
      return {
        store: store.health({ integrity: "quick" }),
        provider_registry_fingerprint: registry.fingerprint ?? null,
        eligible_providers: (registry.entries ?? []).filter((entry) => entry.eligible === true).length,
        unresolved_effects: store.listUnresolvedEffects().length,
        agent_launcher_configured: launcher !== null,
        direct_adapter_access: false,
      };
    },
    fence(input) {
      return gateway.fence(structuredClone(input));
    },
  });
}
