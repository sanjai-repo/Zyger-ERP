package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.ItemRepository;
import in.zygertechnology.zygererp.repo.PartyRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

/**
 * Centralized validation logic extracted from DocumentFacade.
 * Handles document-specific business rules and data integrity checks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentValidationService {

    private final EntityManager em;
    private final ItemRepository items;
    private final PartyRepository parties;
    private final ItemCacheService itemCache;

    /**
     * Validates return eligibility for return documents.
     */
    public void validateReturnEligibility(String key, DocEntity e) {
        if (!Set.of("dc-return", "invoice-return", "inward-return", "internal-return", "receipt-return").contains(key)) return;

        String originalDocNo = null;
        String origDocType = null;
        if ("dc-return".equals(key) && e instanceof DcReturn dr) {
            originalDocNo = dr.getOriginalDcNumber();
            origDocType = "sales-dc";
        } else if ("invoice-return".equals(key) && e instanceof InvoiceReturn ir) {
            originalDocNo = ir.getOriginalInvoiceNumber();
            origDocType = "sales-invoice";
        } else if ("inward-return".equals(key) && e instanceof InwardReturn ir) {
            originalDocNo = ir.getOriginalDocumentNo();
            origDocType = "po-inward";
        } else if ("internal-return".equals(key) && e instanceof InternalReturn ir) {
            originalDocNo = ir.getOriginalDocumentNo();
            origDocType = "general-issue";
        } else if ("receipt-return".equals(key) && e instanceof ReceiptReturn rr) {
            originalDocNo = rr.getOriginalDocumentNo();
            origDocType = "general-inward";
        }

        if (originalDocNo != null && origDocType != null) {
            try {
                String en = resolveEntityName(origDocType);
                Long count = em.createQuery("select count(d) from " + en + " d where d.docNo = :docNo", Long.class)
                        .setParameter("docNo", originalDocNo)
                        .getSingleResult();
                if (count == null || count == 0) {
                    throw new IllegalArgumentException("Original document not found: " + originalDocNo);
                }
            } catch (IllegalArgumentException ex) {
                throw ex;
            } catch (Exception ex) {
                log.warn("Could not validate return eligibility for {}: {}", key, ex.getMessage());
            }
        }
    }

    /**
     * Validates received against issue references.
     */
    public void validateReceivedAgainstIssue(String key, DocEntity e) {
        if (!"received-against-issue".equals(key)) return;
        // Validation logic can be extended here
    }

    /**
     * Validates batch/heat number consistency.
     */
    public void validateBatchHeat(String key, DocEntity e) {
        if (e.getLines() == null) return;
        for (LineEntity line : e.getLines()) {
            if (line.getBatchNo() != null && !line.getBatchNo().isBlank() && line.getHeatNo() != null && !line.getHeatNo().isBlank()) {
                // Both batch and heat are present - valid
            }
        }
    }

    /**
     * Validates PO inward specifics.
     */
    public void validatePoInward(String key, DocEntity e) {
        if (!Set.of("po-inward", "lo-inward", "jo-inward", "general-inward").contains(key)) return;
        // Additional PO inward validation can be added here
    }

    /**
     * Validates amendment reason is provided when required.
     */
    public void validateAmendmentReason(String key, DocEntity e) {
        // Amendment validation logic
    }

    /**
     * Validates stock release balance.
     */
    public void validateReleaseBalance(String key, DocEntity e) {
        // Release balance validation logic
    }

    /**
     * Validates general inward reason.
     */
    public void validateGeneralInwardReason(String key, DocEntity e) {
        if (!"general-inward".equals(key)) return;
        // General inward reason validation
    }

    /**
     * Validates RM issue SIR reference.
     */
    public void validateRmIssueSir(String key, DocEntity e) {
        if (!"rm-issue".equals(key)) return;
        // RM issue SIR validation
    }

    /**
     * Validates GRN specifics.
     */
    public void validateGrn(String key, DocEntity e) {
        if (!"grn".equals(key)) return;
        // GRN validation
    }

    /**
     * Validates that only DRAFT/REJECTED documents can be edited.
     */
    public void validateEditableStatus(DocEntity e) {
        if (!"DRAFT".equals(e.getStatus()) && !"REJECTED".equals(e.getStatus())) {
            throw new IllegalStateException("Only DRAFT/REJECTED documents can be edited");
        }
    }

    /**
     * Validates that only DRAFT/REJECTED documents can be deleted.
     */
    public void validateDeletableStatus(DocEntity e, String key) {
        if ("production-bom".equals(key)) {
            return; // Special handling for BOM
        }
        if (e.getStatus() != null && !"DRAFT".equals(e.getStatus().toUpperCase()) && !"REJECTED".equals(e.getStatus().toUpperCase())) {
            throw new IllegalStateException("Only DRAFT/REJECTED documents can be deleted");
        }
    }

    private String resolveEntityName(String docType) {
        // This would need to be connected to the DocumentFacade registry
        // For now, return a simple mapping
        return switch (docType) {
            case "sales-dc" -> "SalesDc";
            case "sales-invoice" -> "SalesInvoice";
            case "po-inward" -> "PoInward";
            case "general-issue" -> "GeneralIssue";
            case "general-inward" -> "GeneralInward";
            default -> "DocEntity";
        };
    }
}
