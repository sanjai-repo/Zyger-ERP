package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.UOMMaster;
import in.zygertechnology.zygererp.repo.UOMMasterRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * UOM value -> UOM name for printouts, emails and exports. Documents store either the master
 * code (UOM-2026-0001) or a legacy short form (NOS / KG); matching is case-insensitive on code,
 * then name, and falls back to the raw value. Stored data is never changed.
 */
@Service
public class UomNameResolver {

    private static final long TTL_MS = 60_000;
    private static final Set<String> UOM_KEYS = Set.of(
            "uom", "stockUom", "baseUom", "alternateUom", "dimensionUom", "inputUom", "outputUom", "purchaseUom");

    private final UOMMasterRepository uoms;
    private volatile Map<String, String> byKey = Map.of();
    private volatile long loadedAt = 0;

    public UomNameResolver(UOMMasterRepository uoms) { this.uoms = uoms; }

    public String name(String value) {
        if (value == null || value.isBlank()) return value == null ? "" : value;
        return current().getOrDefault(value.toLowerCase(), value);
    }

    /** Replaces every UOM column in the row with its name (in place). */
    public void applyTo(Map<String, Object> row) {
        for (String key : UOM_KEYS) {
            Object v = row.get(key);
            if (v instanceof String s && !s.isBlank()) row.put(key, name(s));
        }
    }

    private Map<String, String> current() {
        long now = System.currentTimeMillis();
        if (now - loadedAt > TTL_MS) {
            Map<String, String> m = new HashMap<>();
            for (UOMMaster u : uoms.findAll()) {
                if (u.getCode() == null) continue;
                String name = (u.getName() == null || u.getName().isBlank()) ? u.getCode() : u.getName();
                m.put(u.getCode().toLowerCase(), name);
                m.putIfAbsent(name.toLowerCase(), name);
            }
            byKey = m;
            loadedAt = now;
        }
        return byKey;
    }
}
