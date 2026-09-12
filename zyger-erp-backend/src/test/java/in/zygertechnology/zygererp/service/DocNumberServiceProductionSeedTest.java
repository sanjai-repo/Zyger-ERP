package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.DocSequence;
import in.zygertechnology.zygererp.entity.NumberingConfig;
import in.zygertechnology.zygererp.repo.DocSequenceRepository;
import in.zygertechnology.zygererp.repo.NumberingConfigRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * P1 — Production numbering continuity test (DOC 18 P1 tests; ADR-PROD-004).
 *
 * Mirrors V2__numbering_config_production_seed.sql: each seeded Production
 * doc_type must resolve through DocNumberService.nextNumberFromConfig to the FRS
 * format {@code PREFIX-PLANTCODE-YEAR-SEQ} (DOC 07 §21.2) using the FRS canonical
 * prefix. This is the DOC 14 TC-19 (numbering continuity) analogue for the P1 seed.
 *
 * Field values replicate the migration exactly (active, prefix, zeroPad,
 * separator, resetPerYear, usePlantSegment, useFySegment, fyStartMonth=April).
 */
@ExtendWith(MockitoExtension.class)
class DocNumberServiceProductionSeedTest {

    @Mock
    private DocSequenceRepository docSequenceRepo;

    @Mock
    private NumberingConfigRepository numberingConfigRepo;

    @Mock
    private EntityManager em;

    @InjectMocks
    private DocNumberService docNumberService;

    /** docType | expected prefix | expected year | expected pad */
    @ParameterizedTest
    @CsvSource({
        "job-card,             JC, 6",
        "production-entry,     PE, 6",
        "product-conversion,   CV, 6",
        "production-return,    PR, 6",
        "production-log-sheet, PL, 6",
        "idle-time-entry,      ID, 6"
    })
    @DisplayName("Seeded production doc-type resolves to FRS-format number from config")
    void seededConfigProducesFrSFormat(String docType, String expectedPrefix, int pad) {
        NumberingConfig config = new NumberingConfig();
        config.setDocType(docType);
        config.setPrefix(expectedPrefix);
        config.setZeroPad(pad);
        config.setSeparator("-");
        config.setActive(true);
        config.setResetPerYear(true);
        config.setUsePlantSegment(true);
        // fyStartMonth = 4 (April) per migration/entity default — verified not consumed
        // by nextNumberFromConfig but kept aligned with the seed.
        config.setFyStartMonth(4);

        when(numberingConfigRepo.findByDocType(docType)).thenReturn(Optional.of(config));

        long plantId = 3L;
        Long seqYear = Long.valueOf(LocalDate.now().getYear());
        String seqKey = docType + "/P" + plantId + "/" + LocalDate.now().getYear();

        DocSequence seq = new DocSequence();
        seq.setKey(seqKey);
        seq.setYear(seqYear.intValue());
        seq.setNext(12L);
        when(docSequenceRepo.findByKeyAndYearForUpdate(anyString(), anyInt())).thenReturn(Optional.of(seq));

        String result = docNumberService.nextNumberFromConfig(docType, plantId);

        // Format: PREFIX-PLANTCODE-YEAR-NNNNN (plant nullable here -> falls back to PLT<id>)
        assertNotNull(result);
        // sequence segment: zero-padded to pad width (here 6)
        assertEquals(expectedPrefix + "-PLT" + plantId + "-" + LocalDate.now().getYear()
                + "-" + String.format("%0" + pad + "d", 12), result);
    }

    @ParameterizedTest
    @CsvSource({ "job-card", "idle-time-entry" })
    @DisplayName("Unknown (unseeded) production doc-type still numbers via fallback")
    void unseededDocTypeFallsBackToLegacy(String docType) {
        when(numberingConfigRepo.findByDocType(docType)).thenReturn(Optional.empty());
        when(docSequenceRepo.findByKeyAndYearForUpdate(anyString(), anyInt()))
                .thenReturn(Optional.empty());

        DocSequence fresh = new DocSequence();
        fresh.setNext(1L);
        when(docSequenceRepo.saveAndFlush(any(DocSequence.class))).thenReturn(fresh);

        assertNotNull(docNumberService.next(docType));
    }
}