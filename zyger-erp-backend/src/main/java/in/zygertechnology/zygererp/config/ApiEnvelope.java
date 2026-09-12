package in.zygertechnology.zygererp.config;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * FRS §5.1: Standard API response envelope.
 * All list endpoints return: { data: [...], meta: { page, size, totalElements, totalPages } }
 * All single-doc endpoints return: { data: {...} }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiEnvelope<T>(T data, Meta meta) {

    public static <T> ApiEnvelope<T> single(T data) {
        return new ApiEnvelope<>(data, null);
    }

    public static <T> ApiEnvelope<T> paged(T data, int page, int size, long totalElements, int totalPages) {
        return new ApiEnvelope<>(data, new Meta(page, size, totalElements, totalPages));
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Meta(int page, int size, long totalElements, int totalPages) {}
}
