FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app
COPY build/libs/zygererp-0.0.1-SNAPSHOT.jar app.jar
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 9090
ENTRYPOINT ["java", "-jar", "app.jar"]
