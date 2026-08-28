package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.doc.DocTypes;
import in.zygertechnology.zygererp.entity.DocSequence;
import in.zygertechnology.zygererp.entity.NumberingConfig;
import in.zygertechnology.zygererp.repo.DocSequenceRepository;
import in.zygertechnology.zygererp.repo.NumberingConfigRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import in.zygertechnology.zygererp.util.FinancialYear;
import java.time.LocalDate;
import java.util.Optional;

@Service
public class DocNumberService {

    private final DocSequenceRepository repo;
    private final NumberingConfigRepository numberingConfigs;
    @PersistenceContext
    private EntityManager em;

    public DocNumberService(DocSequenceRepository repo, NumberingConfigRepository numberingConfigs) {
        this.repo = repo;
        this.numberingConfigs = numberingConfigs;
    }

    @Transactional
    public String next(String docType) {
        String prefix = resolvePrefix(docType);
        return next(docType, prefix);
    }

    private String resolvePrefix(String docType) {
        try {
            return DocTypes.get(docType).prefix();
        } catch (Exception e) {
            if ("sales-order".equalsIgnoreCase(docType)) return "SO";
            else if ("proforma-invoice".equalsIgnoreCase(docType)) return "PI";
            else if ("sales-dc".equalsIgnoreCase(docType)) return "DC";
            else if ("sales-invoice".equalsIgnoreCase(docType)) return "INV";
            else if ("dc-return".equalsIgnoreCase(docType)) return "DCR";
            else if ("invoice-return".equalsIgnoreCase(docType)) return "INVR";
        }
        return docType;
    }

    @Transactional
    public String next(String docType, String prefix) {
        int year = LocalDate.now().getYear();
        String seqKey = docType.toLowerCase() + "/" + year;
        if (seqKey.length() > 60) seqKey = seqKey.substring(0, 60);

        DocSequence seq = repo.findByKeyAndYearForUpdate(seqKey, year).orElse(null);
        if (seq == null) {
            seq = new DocSequence();
            seq.setKey(seqKey);
            seq.setYear(year);
            seq.setNext(1L);
            seq = repo.saveAndFlush(seq);
        }
        long next = seq.getNext() <= 0 ? 1L : seq.getNext();
        seq.setNext(next + 1);
        repo.save(seq);
        return String.format("%s-%d-%04d", prefix.toUpperCase(), year, next);
    }

    /**
     * Read-only preview of the next number for {@code docType}. Does NOT consume or
     * increment the sequence, so it is safe to call on form load / page refresh.
     * Mirrors the format produced by {@link #next(String)}.
     */
    @Transactional(readOnly = true)
    public String peek(String docType) {
        return peek(docType, resolvePrefix(docType));
    }

    /**
     * Read-only preview of the next number for {@code docType} with an explicit prefix.
     * Does NOT consume or increment the sequence.
     */
    @Transactional(readOnly = true)
    public String peek(String docType, String prefix) {
        int year = LocalDate.now().getYear();
        String seqKey = docType.toLowerCase() + "/" + year;
        if (seqKey.length() > 60) seqKey = seqKey.substring(0, 60);

        DocSequence seq = repo.findById(seqKey).orElse(null);
        long next = (seq == null || seq.getNext() <= 0) ? 1L : seq.getNext();
        return String.format("%s-%d-%04d", prefix.toUpperCase(), year, next);
    }

    /**
     * Allocates (consumes) the next number for {@code docType}, returning it. This is the
     * method that must be used when a document/code is actually persisted (Save / Draft),
     * so the sequence only advances on real saves. Same as {@link #next(String)}.
     */
    @Transactional
    public String allocate(String docType) {
        return next(docType);
    }

    /**
     * Configurable numbering path: looks up NumberingConfig for the docType and
     * builds the number from prefix + plantCode (if plantId provided) + separator + year (if resetPerYear) + zero-padded sequence.
     * Falls back to the legacy next(docType) behaviour when no config exists or it is inactive.
     */
    @Transactional
    public String nextNumberFromConfig(String docType, Long plantId) {
        String key = docType == null ? "" : docType.trim().toLowerCase();
        Optional<NumberingConfig> cfgOpt = numberingConfigs.findByDocType(key)
                .filter(c -> Boolean.TRUE.equals(c.getActive()));
        if (cfgOpt.isEmpty()) {
            return next(key);
        }

        NumberingConfig cfg = cfgOpt.get();
        int year = LocalDate.now().getYear();
        boolean perYear = Boolean.TRUE.equals(cfg.getResetPerYear());

        // Plant-scoped sequence key: PREFIX/PLANT_ID/YEAR
        String plantSuffix = (plantId != null && plantId > 0) ? "/P" + plantId : "";
        String seqKey = perYear ? key + plantSuffix + "/" + year : key + plantSuffix + "/global";
        if (seqKey.length() > 60) seqKey = seqKey.substring(0, 60);
        int seqYear = perYear ? year : 0;

        DocSequence seq = repo.findByKeyAndYearForUpdate(seqKey, seqYear).orElse(null);
        if (seq == null) {
            seq = new DocSequence();
            seq.setKey(seqKey);
            seq.setYear(seqYear);
            seq.setNext(1L);
            seq = repo.saveAndFlush(seq);
        }
        long next = seq.getNext() <= 0 ? 1L : seq.getNext();
        seq.setNext(next + 1);
        repo.save(seq);

        int pad = cfg.getZeroPad() == null || cfg.getZeroPad() < 1 ? 6 : cfg.getZeroPad();
        String sep = cfg.getSeparator() == null ? "-" : cfg.getSeparator();
        String prefix = (cfg.getPrefix() == null || cfg.getPrefix().isBlank() ? key : cfg.getPrefix()).toUpperCase();

        // FRS §3.2: PREFIX-PLANTCODE-YYYY-NNNNN format
        StringBuilder sb = new StringBuilder(prefix);
        if (plantId != null && plantId > 0) {
            // Look up plant code for human-readable prefix
            String plantCode = lookupPlantCode(plantId);
            if (plantCode != null) sb.append(sep).append(plantCode);
        }
        if (perYear) sb.append(sep).append(year);
        sb.append(sep).append(String.format("%0" + pad + "d", next));
        return sb.toString();
    }

    /** Legacy overload — no plant scoping. */
    @Transactional
    public String nextNumberFromConfig(String docType) {
        return nextNumberFromConfig(docType, null);
    }

    private String lookupPlantCode(Long plantId) {
        try {
            Object result = em.createQuery("SELECT p.code FROM PlantMaster p WHERE p.id = :id")
                    .setParameter("id", plantId)
                    .getSingleResult();
            return result != null ? result.toString() : "PLT" + plantId;
        } catch (Exception e) {
            return "PLT" + plantId;
        }
    }

    // ─── FY-Aware Numbering (Section 3 standard: PREFIX/FY/00001) ───

    /**
     * Allocates the next FY-format document number: {@code PREFIX/FY/SEQUENCE}.
     * Example: IQC/25-26/00001.
     * Uses DocSequence keyed by (prefix, fyLabel) with pessimistic lock.
     */
    @Transactional
    public String nextFy(String prefix) {
        String fyLabel = FinancialYear.currentLabel();
        String seqKey = prefix.toUpperCase() + ":" + fyLabel;
        if (seqKey.length() > 60) seqKey = seqKey.substring(0, 60);
        int seqYear = FinancialYear.currentStartYear();

        DocSequence seq = repo.findByKeyAndYearForUpdate(seqKey, seqYear).orElse(null);
        if (seq == null) {
            seq = new DocSequence();
            seq.setKey(seqKey);
            seq.setYear(seqYear);
            seq.setNext(1L);
            seq = repo.saveAndFlush(seq);
        }
        long next = seq.getNext() <= 0 ? 1L : seq.getNext();
        seq.setNext(next + 1);
        repo.save(seq);
        return String.format("%s/%s/%05d", prefix.toUpperCase(), fyLabel, next);
    }

    /**
     * Read-only preview of the next FY-format number. Does NOT consume the sequence.
     */
    @Transactional(readOnly = true)
    public String peekFy(String prefix) {
        String fyLabel = FinancialYear.currentLabel();
        String seqKey = prefix.toUpperCase() + ":" + fyLabel;
        if (seqKey.length() > 60) seqKey = seqKey.substring(0, 60);
        int seqYear = FinancialYear.currentStartYear();

        DocSequence seq = repo.findById(seqKey).orElse(null);
        long next = (seq == null || seq.getNext() <= 0) ? 1L : seq.getNext();
        return String.format("%s/%s/%05d", prefix.toUpperCase(), fyLabel, next);
    }

    public static int currentFinancialYearStart() {
        return FinancialYear.currentStartYear();
    }
}
