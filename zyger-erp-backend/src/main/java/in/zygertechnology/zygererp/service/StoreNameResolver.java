package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.LocationMaster;
import in.zygertechnology.zygererp.entity.StoreMaster;
import in.zygertechnology.zygererp.repo.LocationRepository;
import in.zygertechnology.zygererp.repo.StoreMasterRepository;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Store code -> store name, for printouts and exports. Stock and ledger keep the store CODE
 * as the stored value; wherever a person reads a store the NAME is shown instead (the code is
 * only visible in Store Master). Falls back to location_master, then to the raw value.
 */
@Service
public class StoreNameResolver {

    private static final long TTL_MS = 60_000;
    private static final Set<String> STORE_KEYS = Set.of(
            "location", "storeLocation", "sourceLocation", "destinationLocation", "fromLocation", "toLocation",
            "defaultWarehouse", "warehouse", "sourceWarehouse", "destinationWarehouse");

    private final StoreMasterRepository stores;
    private final LocationRepository locations;
    private final UomNameResolver uomNames;
    private volatile Map<String, String> cache = Map.of();
    private volatile long loadedAt = 0;

    public StoreNameResolver(StoreMasterRepository stores, LocationRepository locations, UomNameResolver uomNames) {
        this.stores = stores;
        this.locations = locations;
        this.uomNames = uomNames;
    }

    public String name(String code) {
        if (code == null || code.isBlank()) return code == null ? "" : code;
        return current().getOrDefault(code, code);
    }

    /** Copy of the rows with store-code and UOM columns replaced by their names (for Excel/PDF export). */
    public List<Map<String, Object>> forExport(List<Map<String, Object>> rows) {
        Map<String, String> names = current();
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            Map<String, Object> copy = new LinkedHashMap<>(row);
            boolean hasName = copy.get("storeName") != null;
            for (String key : STORE_KEYS) {
                Object v = copy.get(key);
                if (v instanceof String s && !s.isBlank()) copy.put(key, names.getOrDefault(s, s));
            }
            if (hasName) copy.remove("storeCode");
            uomNames.applyTo(copy);
            out.add(copy);
        }
        return out;
    }

    private Map<String, String> current() {
        long now = System.currentTimeMillis();
        if (now - loadedAt > TTL_MS) {
            Map<String, String> m = new HashMap<>();
            for (LocationMaster l : locations.findAll()) if (l.getCode() != null) m.put(l.getCode(), blank(l.getName()) ? l.getCode() : l.getName());
            for (StoreMaster s : stores.findAll()) if (s.getCode() != null) m.put(s.getCode(), blank(s.getName()) ? s.getCode() : s.getName());
            cache = m;
            loadedAt = now;
        }
        return cache;
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }
}
