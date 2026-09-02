package in.zygertechnology.zygererp.dto;

import lombok.Data;

import java.util.List;

@Data
public class PaginatedResponse<T> {

    private List<T> content;
    private long totalElements;
    private int totalPages;
    private int number;
    private int size;

    public static <T> PaginatedResponse<T> of(List<T> content, long totalElements, int totalPages, int number, int size) {
        PaginatedResponse<T> response = new PaginatedResponse<>();
        response.setContent(content);
        response.setTotalElements(totalElements);
        response.setTotalPages(totalPages);
        response.setNumber(number);
        response.setSize(size);
        return response;
    }
}
