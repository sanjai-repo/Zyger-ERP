# ---- Build stage: compile and package the Spring Boot jar ----
FROM gradle:9.5.1-jdk25 AS build
WORKDIR /app

# Cache gradle deps: copy wrapper + build files first
COPY settings.gradle build.gradle gradlew ./
COPY gradle gradle
RUN gradle --no-daemon dependencies > /dev/null 2>&1 || true

# Copy sources and build the boot jar
COPY src src
RUN gradle --no-daemon bootJar

# ---- Runtime stage ----
FROM eclipse-temurin:25-jre AS runtime

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app
COPY --from=build /app/build/libs/*-SNAPSHOT.jar app.jar

# Set ownership and switch to non-root user
RUN chown -R appuser:appuser /app
USER appuser

ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 9090

# Health check using Spring Boot Actuator
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:9090/actuator/health || exit 1

ENTRYPOINT ["java", "-Xmx512m", "-jar", "app.jar"]
