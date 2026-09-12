package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.DocSequence;
import in.zygertechnology.zygererp.entity.NumberingConfig;
import in.zygertechnology.zygererp.repo.DocSequenceRepository;
import in.zygertechnology.zygererp.repo.NumberingConfigRepository;
import in.zygertechnology.zygererp.util.FinancialYear;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocNumberServiceTest {

    @Mock
    private DocSequenceRepository docSequenceRepo;

    @Mock
    private NumberingConfigRepository numberingConfigRepo;

    @InjectMocks
    private DocNumberService docNumberService;

    @Test
    @DisplayName("Should generate standard document sequence number when sequence exists")
    void testNextExistingSequence() {
        when(numberingConfigRepo.findByDocType(anyString())).thenReturn(Optional.empty());

        DocSequence seq = new DocSequence();
        seq.setKey("sales-order/" + LocalDate.now().getYear());
        seq.setYear(LocalDate.now().getYear());
        seq.setNext(5L);

        when(docSequenceRepo.findByKeyAndYearForUpdate(anyString(), anyInt())).thenReturn(Optional.of(seq));

        String result = docNumberService.next("sales-order");

        assertNotNull(result);
        assertTrue(result.startsWith("SO-"));
        assertTrue(result.endsWith("-0005"));
        assertEquals(6L, seq.getNext());
        verify(docSequenceRepo, times(1)).save(seq);
    }

    @Test
    @DisplayName("Should create new sequence if key does not exist")
    void testNextNewSequence() {
        when(numberingConfigRepo.findByDocType(anyString())).thenReturn(Optional.empty());
        when(docSequenceRepo.findByKeyAndYearForUpdate(anyString(), anyInt())).thenReturn(Optional.empty());

        DocSequence newSeq = new DocSequence();
        newSeq.setNext(1L);
        when(docSequenceRepo.saveAndFlush(any(DocSequence.class))).thenReturn(newSeq);

        String result = docNumberService.next("proforma-invoice");

        assertNotNull(result);
        assertTrue(result.startsWith("PROF-"));
        assertTrue(result.endsWith("-0001"));
        verify(docSequenceRepo, times(1)).saveAndFlush(any(DocSequence.class));
    }

    @Test
    @DisplayName("Should peek next document number without mutating or saving sequence")
    void testPeekDoesNotIncrement() {
        when(numberingConfigRepo.findByDocType(anyString())).thenReturn(Optional.empty());

        DocSequence seq = new DocSequence();
        seq.setNext(10L);
        when(docSequenceRepo.findById(anyString())).thenReturn(Optional.of(seq));

        String result = docNumberService.peek("sales-invoice");

        assertNotNull(result);
        assertTrue(result.startsWith("SINV-"));
        assertTrue(result.endsWith("-0010"));
        assertEquals(10L, seq.getNext());
        verify(docSequenceRepo, never()).save(any());
    }

    @Test
    @DisplayName("Should allocate next FY-format number")
    void testNextFy() {
        DocSequence seq = new DocSequence();
        seq.setNext(1L);

        when(docSequenceRepo.findByKeyAndYearForUpdate(anyString(), anyInt())).thenReturn(Optional.of(seq));

        String result = docNumberService.nextFy("IQC");

        String fyLabel = FinancialYear.currentLabel();
        assertEquals("IQC/" + fyLabel + "/00001", result);
        assertEquals(2L, seq.getNext());
        verify(docSequenceRepo, times(1)).save(seq);
    }

    @Test
    @DisplayName("Should peek next FY-format number without mutating sequence")
    void testPeekFy() {
        DocSequence seq = new DocSequence();
        seq.setNext(3L);

        when(docSequenceRepo.findById(anyString())).thenReturn(Optional.of(seq));

        String result = docNumberService.peekFy("IQC");

        String fyLabel = FinancialYear.currentLabel();
        assertEquals("IQC/" + fyLabel + "/00003", result);
        verify(docSequenceRepo, never()).save(any());
    }

    @Test
    @DisplayName("Should use custom NumberingConfig when available and active")
    void testNextNumberFromConfigWithActiveConfig() {
        NumberingConfig config = new NumberingConfig();
        config.setDocType("custom-doc");
        config.setPrefix("CUST");
        config.setZeroPad(5);
        config.setSeparator("-");
        config.setActive(true);
        config.setResetPerYear(true);

        when(numberingConfigRepo.findByDocType("custom-doc")).thenReturn(Optional.of(config));

        DocSequence seq = new DocSequence();
        seq.setNext(7L);
        when(docSequenceRepo.findByKeyAndYearForUpdate(anyString(), anyInt())).thenReturn(Optional.of(seq));

        String result = docNumberService.nextNumberFromConfig("custom-doc");

        assertNotNull(result);
        assertTrue(result.startsWith("CUST-"));
        assertTrue(result.endsWith("-00007"));
    }
}
