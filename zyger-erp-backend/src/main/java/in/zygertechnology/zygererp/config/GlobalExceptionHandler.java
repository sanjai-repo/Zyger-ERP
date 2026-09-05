package in.zygertechnology.zygererp.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.List;
import java.util.Map;

import jakarta.persistence.OptimisticLockException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(OptimisticLockException.class)
    public ProblemDetail handleOptimisticLock(OptimisticLockException ex) {
        log.warn("Optimistic lock conflict: {}", ex.getMessage());
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, "This document was modified by another user. Please reload and try again.");
        pd.setTitle("Version Conflict");
        pd.setType(URI.create("/errors/version-conflict"));
        pd.setProperty("code", "VERSION_CONFLICT");
        return pd;
    }

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail handleIllegalState(IllegalStateException ex) {
        log.warn("Workflow violation: {}", ex.getMessage());
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, ex.getMessage());
        pd.setTitle("Invalid State Transition");
        pd.setType(URI.create("/errors/workflow-violation"));
        pd.setProperty("code", "WORKFLOW_VIOLATION");
        return pd;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArg(IllegalArgumentException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, ex.getMessage());
        pd.setTitle("Validation Error");
        pd.setType(URI.create("/errors/validation"));
        pd.setProperty("code", "VALIDATION_ERROR");
        return pd;
    }

    @ExceptionHandler(SecurityException.class)
    public ProblemDetail handleSecurity(SecurityException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, ex.getMessage());
        pd.setTitle("Access Denied");
        pd.setType(URI.create("/errors/access-denied"));
        pd.setProperty("code", "FORBIDDEN");
        return pd;
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ProblemDetail handleBusinessRule(BusinessRuleException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage());
        pd.setTitle("Business Rule Violation");
        pd.setType(URI.create("/errors/business-rule"));
        pd.setProperty("code", ex.getRuleCode());
        if (ex.getDetails() != null) {
            ex.getDetails().forEach(pd::setProperty);
        }
        return pd;
    }

    @ExceptionHandler(RateLimitException.class)
    public ProblemDetail handleRateLimit(RateLimitException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.TOO_MANY_REQUESTS, ex.getMessage());
        pd.setTitle("Rate Limit Exceeded");
        pd.setType(URI.create("/errors/rate-limit"));
        pd.setProperty("code", "RATE_LIMIT_EXCEEDED");
        pd.setProperty("retryAfterSeconds", ex.getRetryAfterSeconds());
        return pd;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {

        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of(
                        "field", fe.getField(),
                        "message", fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid",
                        "rejected", fe.getRejectedValue() != null ? String.valueOf(fe.getRejectedValue()) : "null"))
                .toList();

        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Validation failed");
        pd.setTitle("Validation Error");
        pd.setType(URI.create("/errors/validation"));
        pd.setProperty("code", "VALIDATION_ERROR");
        pd.setProperty("errors", errors);
        return pd;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        pd.setTitle("Internal Server Error");
        pd.setType(URI.create("/errors/internal"));
        pd.setProperty("code", "INTERNAL_ERROR");
        return pd;
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ProblemDetail handleMissingParam(org.springframework.web.bind.MissingServletRequestParameterException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Required request parameter '" + ex.getParameterName() + "' is missing");
        pd.setTitle("Bad Request");
        pd.setType(URI.create("/errors/bad-request"));
        pd.setProperty("code", "MISSING_PARAMETER");
        pd.setProperty("parameter", ex.getParameterName());
        return pd;
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Parameter '" + ex.getName() + "' has an invalid value");
        pd.setTitle("Bad Request");
        pd.setType(URI.create("/errors/bad-request"));
        pd.setProperty("code", "INVALID_PARAMETER");
        pd.setProperty("parameter", ex.getName());
        return pd;
    }

    @ExceptionHandler(org.springframework.web.servlet.NoHandlerFoundException.class)
    public ProblemDetail handleNotFound(org.springframework.web.servlet.NoHandlerFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, "The requested resource was not found");
        pd.setTitle("Not Found");
        pd.setType(URI.create("/errors/not-found"));
        pd.setProperty("code", "NOT_FOUND");
        return pd;
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ProblemDetail handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, "The requested resource was not found");
        pd.setTitle("Not Found");
        pd.setType(URI.create("/errors/not-found"));
        pd.setProperty("code", "NOT_FOUND");
        return pd;
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ProblemDetail handleMethodNotSupported(org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.METHOD_NOT_ALLOWED, "HTTP method " + ex.getMethod() + " is not supported for this resource");
        pd.setTitle("Method Not Allowed");
        pd.setType(URI.create("/errors/method-not-allowed"));
        pd.setProperty("code", "METHOD_NOT_ALLOWED");
        return pd;
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, "Access denied: " + ex.getMessage());
        pd.setTitle("Access Denied");
        pd.setType(URI.create("/errors/access-denied"));
        pd.setProperty("code", "FORBIDDEN");
        return pd;
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrity(org.springframework.dao.DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNPROCESSABLE_CONTENT, "The request violates a data constraint");
        pd.setTitle("Data Constraint Violation");
        pd.setType(URI.create("/errors/data-integrity"));
        pd.setProperty("code", "DATA_CONSTRAINT_VIOLATION");
        return pd;
    }

    @ExceptionHandler(java.util.NoSuchElementException.class)
    public ProblemDetail handleNoSuchElement(java.util.NoSuchElementException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, "The requested resource was not found");
        pd.setTitle("Not Found");
        pd.setType(URI.create("/errors/not-found"));
        pd.setProperty("code", "NOT_FOUND");
        return pd;
    }

    @ExceptionHandler(java.lang.RuntimeException.class)
    public ProblemDetail handleNotFoundRuntime(RuntimeException ex) {
        if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("not found")) {
            ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                    HttpStatus.NOT_FOUND, ex.getMessage());
            pd.setTitle("Not Found");
            pd.setType(URI.create("/errors/not-found"));
            pd.setProperty("code", "NOT_FOUND");
            return pd;
        }
        return handleGeneral(ex);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ProblemDetail handleMalformedRequest(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        log.warn("Malformed request body: {}", ex.getMessage());
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Request body is malformed or contains invalid JSON");
        pd.setTitle("Bad Request");
        pd.setType(URI.create("/errors/bad-request"));
        pd.setProperty("code", "MALFORMED_REQUEST");
        return pd;
    }
}
