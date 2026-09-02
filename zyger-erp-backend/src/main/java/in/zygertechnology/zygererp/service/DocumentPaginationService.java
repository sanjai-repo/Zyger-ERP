package in.zygertechnology.zygererp.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Efficient database-level pagination service.
 * Replaces the in-memory pagination in DocumentFacade.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentPaginationService {

    private final EntityManager em;
    private final DocumentRowMapper rowMapper;

    /**
     * Paginated list query at the database level.
     * Applies status, type, itemCode, and search filters as SQL WHERE clauses.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> listPaginated(String key, Map<String, String> q, Class<? extends in.zygertechnology.zygererp.entity.DocEntity> entityClass) {
        String entityName = entityClass.getSimpleName();

        int size = parseOrDefault(q.get("size"), 8);
        int page = parseOrDefault(q.get("page"), 0);

        // Build the count query
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<?> countRoot = countQuery.from(entityClass);
        List<Predicate> predicates = buildPredicates(cb, countRoot, q, key);
        countQuery.select(cb.count(countRoot));
        if (!predicates.isEmpty()) {
            countQuery.where(predicates.toArray(new Predicate[0]));
        }
        long totalElements = em.createQuery(countQuery).getSingleResult();

        // Build the data query
        CriteriaQuery<?> dataQuery = cb.createQuery(entityClass);
        Root<?> dataRoot = dataQuery.from(entityClass);
        List<Predicate> dataPredicates = buildPredicates(cb, dataRoot, q, key);
        if (!dataPredicates.isEmpty()) {
            dataQuery.where(dataPredicates.toArray(new Predicate[0]));
        }
        dataQuery.orderBy(cb.desc(dataRoot.get("docDate")));

        TypedQuery<?> typedQuery = em.createQuery(dataQuery);
        typedQuery.setFirstResult(page * size);
        typedQuery.setMaxResults(size);

        List<?> entities = typedQuery.getResultList();

        // Convert entities to rows
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Object entity : entities) {
            if (entity instanceof in.zygertechnology.zygererp.entity.DocEntity de) {
                rows.add(rowMapper.toRow(de, key));
            }
        }

        int totalPages = Math.max(1, (int) Math.ceil((double) totalElements / size));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", rows);
        result.put("totalElements", totalElements);
        result.put("totalPages", totalPages);
        result.put("number", page);
        result.put("size", size);
        return result;
    }

    private List<Predicate> buildPredicates(CriteriaBuilder cb, Root<?> root, Map<String, String> q, String key) {
        List<Predicate> predicates = new ArrayList<>();

        // Always exclude soft-deleted
        predicates.add(
            cb.or(
                cb.isNull(root.get("deleted")),
                cb.equal(root.get("deleted"), false)
            )
        );

        // Status filter
        String status = q.get("status");
        if (status != null && !status.isBlank()) {
            predicates.add(cb.equal(root.get("status"), status));
        }

        // Item code filter
        String itemCode = q.get("itemCode");
        if (itemCode != null && !itemCode.isBlank()) {
            // Join lines and filter by item code
            try {
                Join<?, ?> lines = root.join("lines", JoinType.LEFT);
                predicates.add(cb.equal(lines.get("itemCode"), itemCode));
            } catch (Exception e) {
                // Entity doesn't have lines, ignore
                log.debug("Entity {} doesn't have lines for item code filter", key);
            }
        }

        // Search filter - search across docNo and party fields
        String search = q.get("search");
        if (search != null && !search.isBlank()) {
            String searchPattern = "%" + search.toLowerCase() + "%";
            Predicate searchPredicate = cb.or(
                cb.like(cb.lower(root.get("docNo").as(String.class)), searchPattern)
            );

            // Also search in party-related fields if they exist
            try {
                searchPredicate = cb.or(searchPredicate,
                    cb.like(cb.lower(root.get("customer").as(String.class)), searchPattern),
                    cb.like(cb.lower(root.get("supplier").as(String.class)), searchPattern)
                );
            } catch (Exception e) {
                // Fields don't exist on this entity
            }

            predicates.add(searchPredicate);
        }

        // Inspection type filter (for quality documents)
        String inspectionType = q.get("inspectionType");
        if (inspectionType == null || inspectionType.isBlank()) {
            inspectionType = q.get("type");
        }
        if (inspectionType != null && !inspectionType.isBlank()) {
            try {
                predicates.add(cb.equal(root.get("inspectionType"), inspectionType));
            } catch (Exception e) {
                try {
                    predicates.add(cb.equal(root.get("type"), inspectionType));
                } catch (Exception ignored) {}
            }
        }

        return predicates;
    }

    private int parseOrDefault(String value, int defaultValue) {
        if (value == null || value.isBlank()) return defaultValue;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
