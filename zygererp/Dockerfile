# --- Build stage ---
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY gradlew gradlew.bat settings.gradle build.gradle ./
COPY gradle gradle
RUN ./gradlew dependencies --no-daemon || true
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

# --- Runtime stage ---
FROM eclipse-temurin:25-jre
WORKDIR /app
USER root
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN groupadd -r zyger && useradd -r -g zyger zyger
COPY --from=build /app/build/libs/*.jar app.jar
RUN chown -R zyger:zyger /app
USER zyger
EXPOSE 9090
ENV JAVA_OPTS="-Xms256m -Xmx512m"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
