package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.CompanyInfoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock private JavaMailSender mailSender;
    @Mock private CompanyInfoRepository companyInfoRepository;
    @InjectMocks private EmailService emailService;

    @Nested
    @DisplayName("sendSupplierEnquiryEmail()")
    class SupplierEnquiryEmail {
        @Test
        @DisplayName("Should throw when enquiry is null")
        void nullEnquiry() {
            assertThrows(IllegalArgumentException.class, () ->
                    emailService.sendSupplierEnquiryEmail(null, "test@example.com", null, null));
        }

        @Test
        @DisplayName("Should return false when recipient email is missing")
        void missingRecipient() {
            SupplierEnquiry enquiry = new SupplierEnquiry();
            enquiry.setDocNo("ENQ-001");
            enquiry.setEmail(null);

            boolean result = emailService.sendSupplierEnquiryEmail(enquiry, null, null, null);
            assertFalse(result);
        }

        @Test
        @DisplayName("Should return false when both emails are blank")
        void blankRecipient() {
            SupplierEnquiry enquiry = new SupplierEnquiry();
            enquiry.setDocNo("ENQ-002");
            enquiry.setEmail("  ");

            boolean result = emailService.sendSupplierEnquiryEmail(enquiry, "", null, null);
            assertFalse(result);
        }
    }

    @Nested
    @DisplayName("sendPurchaseOrderEmail()")
    class PurchaseOrderEmail {
        @Test
        @DisplayName("Should throw when PO is null")
        void nullPo() {
            assertThrows(IllegalArgumentException.class, () ->
                    emailService.sendPurchaseOrderEmail(null, "test@example.com", null, null, "po.pdf"));
        }
    }

    @Nested
    @DisplayName("sendJobOrderEmail()")
    class JobOrderEmail {
        @Test
        @DisplayName("Should throw when JO is null")
        void nullJo() {
            assertThrows(IllegalArgumentException.class, () ->
                    emailService.sendJobOrderEmail(null, "test@example.com", null, null, "jo.pdf"));
        }
    }
}
