package in.zygertechnology.zygererp.config;

import jakarta.persistence.PostPersist;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PreRemove;
import jakarta.persistence.PreUpdate;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.*;

public class AuditEntityListener {

    private Map<String, Object> snapshot;

    @PostLoad
    public void captureSnapshot(Object entity) {
        snapshot = deepCopy(entity);
    }

    @PostPersist
    public void logCreate(Object entity) {
        Map<String, String> changes = new LinkedHashMap<>();
        for (Field f : collectFields(entity.getClass())) {
            f.setAccessible(true);
            try {
                Object val = f.get(entity);
                if (val != null) changes.put(f.getName(), String.valueOf(val));
            } catch (Exception ignored) {}
        }
        AuditLogCollector.collect(
                entity.getClass().getSimpleName(),
                getEntityId(entity),
                "CREATE", changes, null);
    }

    @PreUpdate
    public void logUpdate(Object entity) {
        if (snapshot == null) return;
        Map<String, String> changes = new LinkedHashMap<>();
        for (Field f : collectFields(entity.getClass())) {
            f.setAccessible(true);
            try {
                Object newVal = f.get(entity);
                Object oldVal = snapshot.get(f.getName());
                String oldStr = oldVal == null ? null : String.valueOf(oldVal);
                String newStr = newVal == null ? null : String.valueOf(newVal);
                if (!Objects.equals(oldStr, newStr)) {
                    changes.put(f.getName(), newStr);
                }
            } catch (Exception ignored) {}
        }
        if (!changes.isEmpty()) {
            AuditLogCollector.collect(
                    entity.getClass().getSimpleName(),
                    getEntityId(entity),
                    "UPDATE", changes, snapshot);
        }
    }

    @PreRemove
    public void logDelete(Object entity) {
        AuditLogCollector.collect(
                entity.getClass().getSimpleName(),
                getEntityId(entity),
                "DELETE", Map.of(), snapshot);
    }

    private Long getEntityId(Object entity) {
        try {
            Field id = findField(entity.getClass(), "id");
            if (id != null) {
                id.setAccessible(true);
                Object val = id.get(entity);
                if (val instanceof Long l) return l;
            }
        } catch (Exception ignored) {}
        return 0L;
    }

    private static List<Field> collectFields(Class<?> clazz) {
        List<Field> fields = new ArrayList<>();
        Set<String> names = new HashSet<>();
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            for (Field f : c.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers()) || Modifier.isTransient(f.getModifiers())) continue;
                if (f.isAnnotationPresent(jakarta.persistence.Transient.class)) continue;
                if (names.add(f.getName())) fields.add(f);
            }
        }
        return fields;
    }

    private static Field findField(Class<?> clazz, String name) {
        for (Class<?> c = clazz; c != null && c != Object.class; c = c.getSuperclass()) {
            try { return c.getDeclaredField(name); } catch (NoSuchFieldException ignored) {}
        }
        return null;
    }

    private static Map<String, Object> deepCopy(Object entity) {
        Map<String, Object> copy = new LinkedHashMap<>();
        for (Field f : collectFields(entity.getClass())) {
            f.setAccessible(true);
            try {
                Object val = f.get(entity);
                if (val != null && !isSimpleType(val)) val = String.valueOf(val);
                copy.put(f.getName(), val);
            } catch (Exception ignored) {}
        }
        return copy;
    }

    private static boolean isSimpleType(Object o) {
        return o instanceof String || o instanceof Number || o instanceof Boolean
                || o instanceof java.time.temporal.Temporal || o instanceof java.util.Date
                || o instanceof java.util.UUID || o instanceof java.math.BigDecimal;
    }
}
